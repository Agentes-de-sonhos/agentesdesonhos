CREATE OR REPLACE FUNCTION public.is_within_office_hours_json(p_hours jsonb, p_tz text, p_at timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tz text := COALESCE(NULLIF(p_tz,''), 'America/Sao_Paulo');
  v_local timestamp;
  v_key text;
  v_prev_key text;
  v_min int;
  w jsonb;
  s int;
  e int;
BEGIN
  IF p_hours IS NULL OR jsonb_typeof(p_hours) <> 'object' THEN RETURN NULL; END IF;
  BEGIN
    v_local := p_at AT TIME ZONE v_tz;
  EXCEPTION WHEN others THEN
    v_tz := 'America/Sao_Paulo';
    v_local := p_at AT TIME ZONE v_tz;
  END;

  v_key := lower(to_char(v_local, 'dy'));
  v_prev_key := lower(to_char(v_local - interval '1 day', 'dy'));
  v_min := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;

  FOR w IN SELECT jsonb_array_elements(COALESCE(p_hours->v_key, '[]'::jsonb)) LOOP
    IF jsonb_typeof(w) <> 'array' OR jsonb_array_length(w) <> 2 THEN CONTINUE; END IF;
    s := split_part(w->>0, ':', 1)::int * 60 + split_part(w->>0, ':', 2)::int;
    e := split_part(w->>1, ':', 1)::int * 60 + split_part(w->>1, ':', 2)::int;
    IF e > s THEN
      IF v_min >= s AND v_min < e THEN RETURN true; END IF;
    ELSE
      IF v_min >= s THEN RETURN true; END IF;
    END IF;
  END LOOP;

  FOR w IN SELECT jsonb_array_elements(COALESCE(p_hours->v_prev_key, '[]'::jsonb)) LOOP
    IF jsonb_typeof(w) <> 'array' OR jsonb_array_length(w) <> 2 THEN CONTINUE; END IF;
    s := split_part(w->>0, ':', 1)::int * 60 + split_part(w->>0, ':', 2)::int;
    e := split_part(w->>1, ':', 1)::int * 60 + split_part(w->>1, ':', 2)::int;
    IF e <= s AND v_min < e THEN RETURN true; END IF;
  END LOOP;

  RETURN false;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_within_office_hours_json(jsonb, text, timestamptz) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_conversational_lead(p_token text, p_payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_form RECORD;
  v_is_test boolean := false;
  v_name text;
  v_phone text;
  v_email text;
  v_key text;
  v_existing RECORD;
  v_lead_id uuid;
  v_within boolean;
  v_client uuid;
  v_opp uuid;
BEGIN
  IF p_token IS NULL THEN RETURN json_build_object('error', 'Formulário não encontrado'); END IF;

  SELECT * INTO v_form FROM public.lead_capture_forms WHERE token = p_token;
  IF v_form.id IS NULL THEN RETURN json_build_object('error', 'Formulário não encontrado'); END IF;

  IF COALESCE(v_form.is_active, true) IS NOT TRUE THEN
    IF v_form.test_mode_until IS NOT NULL AND v_form.test_mode_until > now() THEN
      v_is_test := true;
    ELSE
      RETURN json_build_object('error', 'Formulário indisponível');
    END IF;
  END IF;

  v_name := NULLIF(btrim(COALESCE(p_payload->>'lead_name', '')), '');
  v_phone := regexp_replace(COALESCE(p_payload->>'lead_phone', ''), '[^0-9]', '', 'g');
  v_email := lower(NULLIF(btrim(COALESCE(p_payload->>'lead_email', '')), ''));

  IF v_name IS NULL OR length(v_name) < 2 THEN
    RETURN json_build_object('error', 'Informe seu nome completo.');
  END IF;
  IF length(v_phone) < 10 OR length(v_phone) > 15 THEN
    RETURN json_build_object('error', 'Informe um WhatsApp válido com DDD.');
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('error', 'Informe um e-mail válido.');
  END IF;
  IF v_form.require_email AND v_email IS NULL THEN
    RETURN json_build_object('error', 'Informe um e-mail válido.');
  END IF;
  IF (p_payload->>'consent') IS DISTINCT FROM 'true' THEN
    RETURN json_build_object('error', 'É necessário aceitar o uso dos seus dados para contato.');
  END IF;

  v_key := NULLIF(btrim(COALESCE(p_payload->>'idempotency_key', '')), '');

  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.lead_captures WHERE idempotency_key = v_key;
    IF v_existing.id IS NOT NULL THEN
      RETURN json_build_object('lead_id', v_existing.id, 'duplicate', true, 'is_test', v_existing.is_test);
    END IF;
  END IF;

  SELECT * INTO v_existing
  FROM public.lead_captures
  WHERE form_id = v_form.id
    AND public._normalize_phone(lead_phone) = public._normalize_phone(v_phone)
    AND created_at > now() - interval '10 minutes'
  ORDER BY created_at DESC LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN json_build_object('lead_id', v_existing.id, 'duplicate', true, 'is_test', v_existing.is_test);
  END IF;

  v_within := public.is_within_office_hours_json(v_form.office_hours, v_form.timezone, now());

  INSERT INTO public.lead_captures (
    form_id, agent_user_id, lead_name, lead_phone, lead_email,
    destination, travel_dates, travelers_count, budget, additional_info,
    lead_summary, ai_suggestion, whatsapp_message,
    session_id, idempotency_key, consent_at, consent_version, source_url, utm,
    is_test, within_office_hours
  ) VALUES (
    v_form.id, v_form.user_id, left(v_name, 200), v_phone, left(v_email, 200),
    left(NULLIF(btrim(COALESCE(p_payload->>'destination','')), ''), 300),
    left(NULLIF(btrim(COALESCE(p_payload->>'travel_dates','')), ''), 200),
    left(NULLIF(btrim(COALESCE(p_payload->>'travelers_count','')), ''), 100),
    left(NULLIF(btrim(COALESCE(p_payload->>'budget','')), ''), 200),
    left(NULLIF(btrim(COALESCE(p_payload->>'additional_info','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'lead_summary','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'ai_suggestion','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'whatsapp_message','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'session_id','')), ''), 100),
    v_key, now(),
    left(COALESCE(p_payload->>'consent_version', 'v1'), 20),
    left(NULLIF(btrim(COALESCE(p_payload->>'source_url','')), ''), 500),
    CASE WHEN p_payload ? 'utm' THEN p_payload->'utm' ELSE NULL END,
    v_is_test, v_within
  )
  RETURNING id INTO v_lead_id;

  IF NOT v_is_test THEN
    BEGIN
      SELECT client_id, opportunity_id INTO v_client, v_opp
      FROM public.ensure_client_and_opportunity_for_lead(
        v_form.user_id, v_name, v_phone, v_email, p_payload->>'destination'
      );
      UPDATE public.lead_captures SET client_id = v_client, opportunity_id = v_opp WHERE id = v_lead_id;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'CRM sync failed for lead %: %', v_lead_id, SQLERRM;
    END;

    UPDATE public.lead_capture_forms SET leads_count = leads_count + 1 WHERE id = v_form.id;
  END IF;

  BEGIN
    PERFORM public.enqueue_lead_form_notifications(v_lead_id);
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Notification enqueue failed for lead %: %', v_lead_id, SQLERRM;
  END;

  RETURN json_build_object(
    'lead_id', v_lead_id,
    'duplicate', false,
    'is_test', v_is_test,
    'within_office_hours', v_within
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_conversational_lead(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_conversational_lead(text, jsonb) TO service_role;