-- Sites ADS: mapear a solicitação pública para os campos estruturados da oportunidade.
-- notes da oportunidade passa a conter SOMENTE observações digitadas pelo cliente.

CREATE OR REPLACE FUNCTION public.agency_request_service_label(p_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(btrim(coalesce(p_key, '')))
    WHEN 'aereo' THEN 'Aéreo'
    WHEN 'hospedagem' THEN 'Hospedagem'
    WHEN 'carro' THEN 'Aluguel de Carro'
    WHEN 'transfer' THEN 'Transfer'
    WHEN 'ingressos' THEN 'Ingressos e Atrações'
    WHEN 'seguro' THEN 'Seguro Viagem'
    WHEN 'cruzeiros' THEN 'Cruzeiros'
    WHEN 'pacotes' THEN 'Pacotes e Circuitos'
    WHEN 'inspiracoes' THEN 'Inspirações'
    ELSE NULLIF(btrim(coalesce(p_key, '')), '')
  END
$$;

-- Primeiro valor não vazio entre as chaves informadas.
CREATE OR REPLACE FUNCTION public.agency_request_detail(p_details jsonb, p_keys text[])
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE k text; v text;
BEGIN
  IF p_details IS NULL OR p_keys IS NULL THEN RETURN NULL; END IF;
  FOREACH k IN ARRAY p_keys LOOP
    v := NULLIF(btrim(coalesce(p_details->>k, '')), '');
    IF v IS NOT NULL THEN RETURN v; END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- Primeira data válida (YYYY-MM-DD) entre as chaves informadas.
CREATE OR REPLACE FUNCTION public.agency_request_date(p_details jsonb, p_keys text[])
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE k text; v text;
BEGIN
  IF p_details IS NULL OR p_keys IS NULL THEN RETURN NULL; END IF;
  FOREACH k IN ARRAY p_keys LOOP
    v := NULLIF(btrim(coalesce(p_details->>k, '')), '');
    IF v ~ '^\d{4}-\d{2}-\d{2}$' THEN
      BEGIN
        RETURN v::date;
      EXCEPTION WHEN others THEN
        NULL;
      END;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- Somente observações digitadas pelo cliente, com rótulo humano por serviço/ocorrência
-- e a observação final do checkout. Sem destino/datas/viajantes/summary/hostname.
CREATE OR REPLACE FUNCTION public.agency_request_client_notes(p_details jsonb, p_checkout_notes text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_details jsonb := coalesce(p_details, '{}'::jsonb);
  v_keys text[];
  v_labels text[];
  v_lines text[] := '{}'::text[];
  v_used text[] := '{}'::text[];
  v_counts jsonb := '{}'::jsonb;
  i int;
  v_key text;
  v_label text;
  v_occ int;
  v_suffix text;
  v_detail_key text;
  v_alt_key text;
  v_text text;
  v_primary_label text;
  r record;
BEGIN
  v_keys := CASE
    WHEN coalesce(v_details->>'servicos_keys', '') = '' THEN ARRAY['']::text[]
    ELSE string_to_array(replace(v_details->>'servicos_keys', ' ', ''), ',')
  END;
  v_labels := CASE
    WHEN coalesce(v_details->>'servicos', '') = '' THEN '{}'::text[]
    ELSE string_to_array(v_details->>'servicos', ', ')
  END;

  v_primary_label := coalesce(
    NULLIF(btrim(coalesce(v_labels[1], '')), ''),
    public.agency_request_service_label(v_keys[1]),
    'Serviço'
  );

  FOR i IN 1..array_length(v_keys, 1) LOOP
    v_key := lower(btrim(coalesce(v_keys[i], '')));
    v_occ := coalesce((v_counts->>v_key)::int, 0) + 1;
    v_counts := jsonb_set(v_counts, ARRAY[v_key], to_jsonb(v_occ), true);
    v_suffix := CASE WHEN v_occ > 1 THEN '_' || v_occ ELSE '' END;

    v_label := coalesce(
      NULLIF(btrim(coalesce(v_labels[i], '')), ''),
      coalesce(public.agency_request_service_label(v_key), 'Serviço')
        || CASE WHEN v_occ > 1 THEN ' ' || v_occ ELSE '' END
    );

    IF i = 1 THEN
      v_detail_key := 'observacoes' || v_suffix;
      v_alt_key := CASE WHEN v_key = '' THEN NULL ELSE v_key || v_suffix || '_observacoes' END;
    ELSE
      v_detail_key := CASE WHEN v_key = '' THEN 'observacoes' || v_suffix ELSE v_key || v_suffix || '_observacoes' END;
      v_alt_key := 'observacoes' || v_suffix;
    END IF;

    v_text := NULLIF(btrim(coalesce(v_details->>v_detail_key, '')), '');
    IF v_text IS NULL AND v_alt_key IS NOT NULL THEN
      v_text := NULLIF(btrim(coalesce(v_details->>v_alt_key, '')), '');
      IF v_text IS NOT NULL THEN v_detail_key := v_alt_key; END IF;
    END IF;

    IF v_text IS NOT NULL THEN
      v_lines := v_lines || ('Observações — ' || v_label || ': ' || v_text);
      v_used := v_used || v_detail_key;
    END IF;
  END LOOP;

  -- Observações remanescentes (chaves não previstas pela ordem de serviços).
  FOR r IN
    SELECT key, value
    FROM jsonb_each_text(v_details)
    WHERE key ~ '(^|_)observacoes(_[0-9]+)?$'
    ORDER BY key
  LOOP
    IF r.key = ANY (v_used) THEN CONTINUE; END IF;
    v_text := NULLIF(btrim(coalesce(r.value, '')), '');
    IF v_text IS NULL THEN CONTINUE; END IF;
    v_used := v_used || r.key;

    v_key := regexp_replace(r.key, '_?observacoes(_[0-9]+)?$', '');
    v_occ := coalesce(
      NULLIF(substring(v_key from '_([0-9]+)$'), '')::int,
      NULLIF(substring(r.key from 'observacoes_([0-9]+)$'), '')::int,
      1
    );
    v_key := lower(regexp_replace(v_key, '_[0-9]+$', ''));
    v_label := coalesce(public.agency_request_service_label(v_key), v_primary_label)
      || CASE WHEN v_occ > 1 THEN ' ' || v_occ ELSE '' END;
    v_lines := v_lines || ('Observações — ' || v_label || ': ' || v_text);
  END LOOP;

  v_text := NULLIF(btrim(coalesce(p_checkout_notes, '')), '');
  IF v_text IS NOT NULL THEN
    v_lines := v_lines || ('Observações — Checkout: ' || v_text);
  END IF;

  IF array_length(v_lines, 1) IS NULL THEN RETURN NULL; END IF;
  RETURN array_to_string(v_lines, E'\n');
END;
$$;

-- Aplica os campos estruturados na oportunidade criada a partir da solicitação.
CREATE OR REPLACE FUNCTION public.apply_agency_request_to_opportunity(p_request_id uuid, p_opportunity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_details jsonb;
  v_adults int;
  v_kids int;
  v_start date;
  v_end date;
  v_notes text;
BEGIN
  SELECT * INTO r FROM public.agency_site_requests WHERE id = p_request_id;
  IF r.id IS NULL OR p_opportunity_id IS NULL THEN RETURN; END IF;
  v_details := coalesce(r.details, '{}'::jsonb);

  v_adults := greatest(1, coalesce(
    NULLIF(regexp_replace(coalesce(public.agency_request_detail(v_details, ARRAY['ctx_adultos','adultos']), ''), '[^0-9]', '', 'g'), '')::int,
    1));
  v_kids := greatest(0, coalesce(
    NULLIF(regexp_replace(coalesce(public.agency_request_detail(v_details, ARRAY['ctx_criancas','criancas']), ''), '[^0-9]', '', 'g'), '')::int,
    0));
  v_start := public.agency_request_date(v_details, ARRAY['ctx_data_inicio','check_in','data_ida','retirada_data','data','inicio','embarque']);
  v_end := public.agency_request_date(v_details, ARRAY['ctx_data_fim','check_out','data_volta','devolucao_data','fim']);
  v_notes := public.agency_request_client_notes(v_details, r.notes);

  UPDATE public.opportunities
     SET destination = coalesce(NULLIF(btrim(coalesce(r.destination, '')), ''),
                                public.agency_request_detail(v_details, ARRAY['ctx_destino','destino']),
                                destination),
         start_date = v_start,
         end_date = v_end,
         adults_count = v_adults,
         children_count = v_kids,
         passengers_count = v_adults + v_kids,
         notes = v_notes,
         updated_at = now()
   WHERE id = p_opportunity_id
     AND user_id = r.agency_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_agency_request_to_opportunity(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_agency_request_to_opportunity(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.agency_request_service_label(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_request_detail(jsonb, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_request_date(jsonb, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_request_client_notes(jsonb, text) TO authenticated, service_role;

-- RPC pública: substitui o bloco que escrevia summary/hostname em opportunities.notes.
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
  v_allowed text[] := ARRAY['aereo','hospedagem','carro','transfer','ingressos','seguro','cruzeiros','pacotes','inspiracoes'];
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
      PERFORM public.apply_agency_request_to_opportunity(v_id, v_opp);
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'CRM sync failed for agency site request %: %', v_id, SQLERRM;
  END;

  RETURN json_build_object('request_id', v_id, 'duplicate', false);
END;
$function$;