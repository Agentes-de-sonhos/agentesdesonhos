ALTER TABLE public.product_landing_views ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_landing_leads ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.agency_product_landings ADD COLUMN IF NOT EXISTS test_mode_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_plv_landing_is_test ON public.product_landing_views (landing_id, is_test);
CREATE INDEX IF NOT EXISTS idx_pll_landing_is_test ON public.product_landing_leads (landing_id, is_test);

-- Recalcula contadores usando apenas registros NÃO sintéticos
CREATE OR REPLACE FUNCTION public.recalc_product_landing_counters(p_landing_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_views int; v_leads int;
BEGIN
  SELECT count(*) INTO v_views FROM public.product_landing_views WHERE landing_id = p_landing_id AND is_test = false;
  SELECT count(*) INTO v_leads FROM public.product_landing_leads WHERE landing_id = p_landing_id AND is_test = false;
  UPDATE public.agency_product_landings
  SET views_count = v_views, leads_count = v_leads
  WHERE id = p_landing_id;
  RETURN json_build_object('landing_id', p_landing_id, 'views_count', v_views, 'leads_count', v_leads);
END;
$$;

-- Somente administradores ligam/desligam o modo homologação (com expiração automática)
CREATE OR REPLACE FUNCTION public.set_product_landing_test_mode(p_landing_id uuid, p_minutes int DEFAULT 60)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_until timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('error', 'Não autorizado');
  END IF;
  IF p_minutes IS NULL OR p_minutes <= 0 THEN
    v_until := NULL;
  ELSE
    v_until := now() + make_interval(mins => least(p_minutes, 240));
  END IF;
  UPDATE public.agency_product_landings SET test_mode_until = v_until WHERE id = p_landing_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Landing não encontrada');
  END IF;
  RETURN json_build_object('success', true, 'test_mode_until', v_until);
END;
$$;

-- Marca eventos de um intervalo como homologação e recalcula (auditável, específico)
CREATE OR REPLACE FUNCTION public.mark_product_landing_test_events(
  p_landing_id uuid, p_from timestamptz, p_to timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_v int; v_l int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('error', 'Não autorizado');
  END IF;
  IF p_landing_id IS NULL OR p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN
    RETURN json_build_object('error', 'Intervalo inválido');
  END IF;

  UPDATE public.product_landing_views SET is_test = true
  WHERE landing_id = p_landing_id AND is_test = false AND created_at >= p_from AND created_at <= p_to;
  GET DIAGNOSTICS v_v = ROW_COUNT;

  UPDATE public.product_landing_leads SET is_test = true
  WHERE landing_id = p_landing_id AND is_test = false AND created_at >= p_from AND created_at <= p_to;
  GET DIAGNOSTICS v_l = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'views_marked', v_v,
    'leads_marked', v_l,
    'counters', public.recalc_product_landing_counters(p_landing_id)
  );
END;
$$;

-- Tracking de visualização: marca teste pelo estado do servidor, nunca pelo cliente
CREATE OR REPLACE FUNCTION public.track_product_landing_view(p_landing_id uuid, p_session_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ok boolean := false;
  v_is_test boolean := false;
BEGIN
  IF p_landing_id IS NULL OR p_session_hash IS NULL OR length(p_session_hash) > 128 THEN
    RETURN;
  END IF;

  SELECT COALESCE(test_mode_until > now(), false) INTO v_is_test
  FROM public.agency_product_landings
  WHERE id = p_landing_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.product_landing_views (landing_id, session_hash, viewed_date, is_test)
  VALUES (p_landing_id, p_session_hash, CURRENT_DATE, v_is_test)
  ON CONFLICT (landing_id, session_hash, viewed_date) DO NOTHING;

  GET DIAGNOSTICS v_ok = ROW_COUNT;
  IF v_ok AND NOT v_is_test THEN
    UPDATE public.agency_product_landings
    SET views_count = views_count + 1
    WHERE id = p_landing_id;
  END IF;
END;
$$;

-- Submissão de lead: idem, marcação de teste apenas server-side
CREATE OR REPLACE FUNCTION public.submit_product_landing_lead(p_product_key text, p_slug text, p_payload jsonb, p_idempotency_key text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_landing RECORD;
  v_name text;
  v_phone text;
  v_email text;
  v_phone_digits text;
  v_existing RECORD;
  v_client_id uuid;
  v_opp_id uuid;
  v_lead_id uuid;
  v_destination text;
  v_is_test boolean := false;
BEGIN
  IF p_product_key IS NULL OR p_slug IS NULL OR p_payload IS NULL THEN
    RETURN json_build_object('error', 'Dados inválidos');
  END IF;

  SELECT * INTO v_landing
  FROM public.agency_product_landings
  WHERE product_key = p_product_key AND slug = lower(p_slug) AND status = 'active';

  IF v_landing IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  v_is_test := COALESCE(v_landing.test_mode_until > now(), false);

  v_name  := trim(COALESCE(p_payload->>'lead_name', ''));
  v_phone := trim(COALESCE(p_payload->>'lead_phone', ''));
  v_email := NULLIF(trim(COALESCE(p_payload->>'lead_email', '')), '');
  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');

  IF length(v_name) < 2 OR length(v_name) > 120 THEN
    RETURN json_build_object('error', 'Informe um nome válido.');
  END IF;
  IF length(v_phone_digits) < 10 OR length(v_phone_digits) > 15 THEN
    RETURN json_build_object('error', 'Informe um WhatsApp válido com DDD.');
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('error', 'Informe um e-mail válido.');
  END IF;
  IF COALESCE((p_payload->>'consent_accepted')::boolean, false) IS NOT TRUE THEN
    RETURN json_build_object('error', 'É necessário aceitar a política de privacidade.');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.product_landing_leads
    WHERE landing_id = v_landing.id AND idempotency_key = p_idempotency_key;
    IF v_existing.id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'duplicate', true);
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.product_landing_leads
  WHERE landing_id = v_landing.id
    AND public._normalize_phone(lead_phone) = public._normalize_phone(v_phone)
    AND created_at > now() - interval '30 minutes'
  ORDER BY created_at DESC LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'duplicate', true);
  END IF;

  v_destination := COALESCE(NULLIF(trim(COALESCE(p_payload->>'destination','')), ''), 'Transamerica Comandatuba');

  SELECT client_id, opportunity_id INTO v_client_id, v_opp_id
  FROM public.ensure_client_and_opportunity_for_lead(
    v_landing.user_id, v_name, v_phone, v_email, v_destination
  );

  INSERT INTO public.product_landing_leads (
    landing_id, user_id, product_key, client_id, opportunity_id,
    lead_name, lead_phone, lead_email, origin_city, travel_period,
    adults, children, children_ages, interest_category, message,
    consent_accepted, consent_at,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer, page_url, user_agent, idempotency_key, is_test
  ) VALUES (
    v_landing.id, v_landing.user_id, v_landing.product_key, v_client_id, v_opp_id,
    v_name, v_phone, v_email,
    left(NULLIF(trim(COALESCE(p_payload->>'origin_city','')), ''), 120),
    left(NULLIF(trim(COALESCE(p_payload->>'travel_period','')), ''), 120),
    NULLIF(p_payload->>'adults','')::int,
    NULLIF(p_payload->>'children','')::int,
    left(NULLIF(trim(COALESCE(p_payload->>'children_ages','')), ''), 120),
    left(NULLIF(trim(COALESCE(p_payload->>'interest_category','')), ''), 160),
    left(NULLIF(trim(COALESCE(p_payload->>'message','')), ''), 2000),
    true, now(),
    left(NULLIF(p_payload->>'utm_source',''), 160),
    left(NULLIF(p_payload->>'utm_medium',''), 160),
    left(NULLIF(p_payload->>'utm_campaign',''), 160),
    left(NULLIF(p_payload->>'utm_content',''), 160),
    left(NULLIF(p_payload->>'utm_term',''), 160),
    left(NULLIF(p_payload->>'referrer',''), 500),
    left(NULLIF(p_payload->>'page_url',''), 500),
    left(NULLIF(p_payload->>'user_agent',''), 300),
    left(NULLIF(p_idempotency_key,''), 120),
    v_is_test
  )
  RETURNING id INTO v_lead_id;

  IF NOT v_is_test THEN
    UPDATE public.agency_product_landings
    SET leads_count = leads_count + 1
    WHERE id = v_landing.id;
  END IF;

  RETURN json_build_object('success', true, 'lead_id', v_lead_id, 'is_test', v_is_test);
END;
$$;