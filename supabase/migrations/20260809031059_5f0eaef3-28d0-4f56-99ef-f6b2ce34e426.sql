-- 1) Idempotência por tenant (aditivo e seguro para os dados já existentes)
ALTER TABLE public.agency_site_requests
  DROP CONSTRAINT IF EXISTS agency_site_requests_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS agency_site_requests_tenant_idem_uidx
  ON public.agency_site_requests (agency_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2) Allowlist SQL dos service_key válidos
ALTER TABLE public.agency_site_requests
  DROP CONSTRAINT IF EXISTS agency_site_requests_service_key_check;

ALTER TABLE public.agency_site_requests
  ADD CONSTRAINT agency_site_requests_service_key_check
  CHECK (service_key IN ('aereo','hospedagem','carro','transfer','ingressos','seguro','cruzeiros','pacotes'));

-- 3) RPC com duplicidade SEMPRE escopada pela agência do hostname + allowlist
CREATE OR REPLACE FUNCTION public.submit_agency_site_request(p_hostname text, p_payload jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_domain RECORD;
  v_name text;
  v_phone text;
  v_email text;
  v_key text;
  v_service text;
  v_existing RECORD;
  v_id uuid;
  v_client uuid;
  v_opp uuid;
  v_dest text;
  v_allowed text[] := ARRAY['aereo','hospedagem','carro','transfer','ingressos','seguro','cruzeiros','pacotes'];
BEGIN
  IF p_hostname IS NULL THEN
    RETURN json_build_object('error', 'Site não encontrado.');
  END IF;

  SELECT * INTO v_domain
  FROM public.agency_public_domains
  WHERE is_active AND hostname = lower(btrim(p_hostname))
  LIMIT 1;

  IF v_domain.user_id IS NULL THEN
    RETURN json_build_object('error', 'Site não encontrado.');
  END IF;

  v_name := NULLIF(btrim(COALESCE(p_payload->>'lead_name', '')), '');
  v_phone := regexp_replace(COALESCE(p_payload->>'lead_phone', ''), '[^0-9]', '', 'g');
  v_email := lower(NULLIF(btrim(COALESCE(p_payload->>'lead_email', '')), ''));
  v_service := NULLIF(btrim(lower(COALESCE(p_payload->>'service_key', ''))), '');

  IF v_name IS NULL OR length(v_name) < 2 THEN
    RETURN json_build_object('error', 'Informe seu nome completo.');
  END IF;
  IF v_phone <> '' AND (length(v_phone) < 10 OR length(v_phone) > 15) THEN
    RETURN json_build_object('error', 'Informe um WhatsApp válido com DDD.');
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('error', 'Informe um e-mail válido.');
  END IF;
  IF v_phone = '' AND v_email IS NULL THEN
    RETURN json_build_object('error', 'Informe seu WhatsApp ou e-mail para contato.');
  END IF;
  IF (p_payload->>'consent') IS DISTINCT FROM 'true' THEN
    RETURN json_build_object('error', 'É necessário aceitar o uso dos seus dados para contato.');
  END IF;
  IF v_service IS NULL OR NOT (v_service = ANY (v_allowed)) THEN
    RETURN json_build_object('error', 'Selecione o serviço desejado.');
  END IF;

  -- Idempotência SEMPRE dentro da agência resolvida pelo hostname
  v_key := NULLIF(btrim(COALESCE(p_payload->>'idempotency_key', '')), '');
  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.agency_site_requests
    WHERE agency_user_id = v_domain.user_id
      AND idempotency_key = v_key
    LIMIT 1;
    IF v_existing.id IS NOT NULL THEN
      RETURN json_build_object('request_id', v_existing.id, 'duplicate', true);
    END IF;
  END IF;

  IF v_phone <> '' THEN
    SELECT * INTO v_existing
    FROM public.agency_site_requests
    WHERE agency_user_id = v_domain.user_id
      AND service_key = v_service
      AND public._normalize_phone(lead_phone) = public._normalize_phone(v_phone)
      AND created_at > now() - interval '10 minutes'
    ORDER BY created_at DESC LIMIT 1;
    IF v_existing.id IS NOT NULL THEN
      RETURN json_build_object('request_id', v_existing.id, 'duplicate', true);
    END IF;
  END IF;

  v_dest := left(NULLIF(btrim(COALESCE(p_payload->>'destination', '')), ''), 300);

  INSERT INTO public.agency_site_requests (
    agency_user_id, hostname, service_key, service_label,
    lead_name, lead_phone, lead_email, preferred_channel, best_time,
    destination, summary, details, notes,
    consent_at, consent_version, source_url, utm, session_id, idempotency_key
  ) VALUES (
    v_domain.user_id,
    lower(btrim(p_hostname)),
    v_service,
    left(NULLIF(btrim(COALESCE(p_payload->>'service_label', '')), ''), 120),
    left(v_name, 200),
    NULLIF(v_phone, ''),
    left(v_email, 200),
    left(NULLIF(btrim(COALESCE(p_payload->>'preferred_channel', '')), ''), 40),
    left(NULLIF(btrim(COALESCE(p_payload->>'best_time', '')), ''), 60),
    v_dest,
    left(NULLIF(btrim(COALESCE(p_payload->>'summary', '')), ''), 2000),
    COALESCE(p_payload->'details', '{}'::jsonb),
    left(NULLIF(btrim(COALESCE(p_payload->>'notes', '')), ''), 2000),
    now(),
    left(COALESCE(p_payload->>'consent_version', 'v1'), 20),
    left(NULLIF(btrim(COALESCE(p_payload->>'source_url', '')), ''), 500),
    CASE WHEN p_payload ? 'utm' THEN p_payload->'utm' ELSE NULL END,
    left(NULLIF(btrim(COALESCE(p_payload->>'session_id', '')), ''), 100),
    v_key
  )
  RETURNING id INTO v_id;

  BEGIN
    SELECT client_id, opportunity_id INTO v_client, v_opp
    FROM public.ensure_client_and_opportunity_for_lead(
      v_domain.user_id, v_name, v_phone, v_email, v_dest
    );
    UPDATE public.agency_site_requests
       SET client_id = v_client, opportunity_id = v_opp
     WHERE id = v_id;

    IF v_opp IS NOT NULL THEN
      UPDATE public.opportunities
         SET notes = concat_ws(
               E'\n',
               'Solicitação recebida pelo site white label (' || lower(btrim(p_hostname)) || ').',
               'Serviço: ' || COALESCE(NULLIF(btrim(COALESCE(p_payload->>'service_label', '')), ''), v_service),
               NULLIF(btrim(COALESCE(p_payload->>'summary', '')), '')
             )
       WHERE id = v_opp;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'CRM sync failed for agency site request %: %', v_id, SQLERRM;
  END;

  RETURN json_build_object('request_id', v_id, 'duplicate', false);
END;
$function$;