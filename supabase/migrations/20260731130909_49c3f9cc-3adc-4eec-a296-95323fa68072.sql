ALTER TABLE public.agency_product_landings
  ADD COLUMN IF NOT EXISTS override_legal_name text,
  ADD COLUMN IF NOT EXISTS override_cnpj text,
  ADD COLUMN IF NOT EXISTS override_address text,
  ADD COLUMN IF NOT EXISTS override_website text,
  ADD COLUMN IF NOT EXISTS override_privacy_email text,
  ADD COLUMN IF NOT EXISTS override_privacy_officer text;

ALTER TABLE public.product_landing_leads
  ADD COLUMN IF NOT EXISTS consent_policy_version text,
  ADD COLUMN IF NOT EXISTS consent_terms_version text;

CREATE OR REPLACE FUNCTION public.get_public_product_landing(p_product_key text, p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_landing RECORD;
  v_profile RECORD;
  v_address text;
BEGIN
  IF p_slug IS NULL OR length(p_slug) < 2 OR length(p_slug) > 60
     OR p_product_key IS NULL OR length(p_product_key) > 80 THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  SELECT * INTO v_landing
  FROM public.agency_product_landings
  WHERE product_key = p_product_key
    AND slug = lower(p_slug)
    AND status = 'active';

  IF v_landing IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_landing.user_id;
  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  v_address := NULLIF(btrim(concat_ws(', ',
    NULLIF(btrim(concat_ws(' ', NULLIF(v_profile.street, ''), NULLIF(v_profile.address_number, ''))), ''),
    NULLIF(v_profile.neighborhood, ''),
    NULLIF(v_profile.zip_code, '')
  )), '');

  RETURN json_build_object(
    'landing_id', v_landing.id,
    'product_key', v_landing.product_key,
    'slug', v_landing.slug,
    'agency_name', COALESCE(NULLIF(v_landing.override_agency_name, ''), NULLIF(v_profile.agency_name, ''), v_profile.name),
    'logo_url', COALESCE(NULLIF(v_landing.override_logo_url, ''), v_profile.agency_logo_url),
    'whatsapp', regexp_replace(COALESCE(NULLIF(v_landing.override_whatsapp, ''), v_profile.phone, ''), '[^0-9]', '', 'g'),
    'phone', COALESCE(NULLIF(v_landing.override_phone, ''), v_profile.phone),
    'email', NULLIF(v_landing.override_email, ''),
    'city', COALESCE(NULLIF(v_landing.override_city, ''), v_profile.city),
    'consultant_name', COALESCE(NULLIF(v_landing.override_consultant_name, ''), v_profile.name),
    'consultant_role', COALESCE(NULLIF(v_landing.override_consultant_role, ''), 'Consultor(a) de viagens'),
    'consultant_photo_url', COALESCE(NULLIF(v_landing.override_consultant_photo_url, ''), v_profile.avatar_url),
    'whatsapp_message_template', v_landing.whatsapp_message_template,
    'timezone', v_landing.timezone,
    'office_hours', v_landing.office_hours,
    'server_now', now(),
    'legal', json_build_object(
      'legal_name', NULLIF(btrim(COALESCE(v_landing.override_legal_name, '')), ''),
      'cnpj', COALESCE(NULLIF(btrim(COALESCE(v_landing.override_cnpj, '')), ''), NULLIF(v_profile.cnpj, '')),
      'address', COALESCE(NULLIF(btrim(COALESCE(v_landing.override_address, '')), ''), v_address),
      'city', COALESCE(NULLIF(v_landing.override_city, ''), NULLIF(v_profile.city, '')),
      'state', NULLIF(v_profile.state, ''),
      'website', NULLIF(btrim(COALESCE(v_landing.override_website, '')), ''),
      'privacy_email', COALESCE(NULLIF(btrim(COALESCE(v_landing.override_privacy_email, '')), ''), NULLIF(v_landing.override_email, '')),
      'privacy_officer', NULLIF(btrim(COALESCE(v_landing.override_privacy_officer, '')), '')
    )
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.submit_product_landing_lead(p_product_key text, p_slug text, p_payload jsonb, p_idempotency_key text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
  v_assignee uuid;
  v_assignee_cfg uuid;
  v_reason text;
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

  SELECT default_assignee_member_id INTO v_assignee_cfg
  FROM public.product_landing_notification_settings WHERE landing_id = v_landing.id;

  IF v_assignee_cfg IS NOT NULL THEN
    SELECT m.id INTO v_assignee FROM public.agency_team_members m
    WHERE m.id = v_assignee_cfg AND m.agency_id = v_landing.user_id AND m.status = 'active';
    IF v_assignee IS NULL THEN
      v_reason := 'responsavel_indisponivel_fallback_titular';
    ELSE
      v_reason := 'responsavel_padrao_da_landing';
    END IF;
  ELSE
    v_reason := 'sem_responsavel_configurado_fallback_titular';
  END IF;

  INSERT INTO public.product_landing_leads (
    landing_id, user_id, product_key, client_id, opportunity_id,
    lead_name, lead_phone, lead_email, origin_city, travel_period,
    adults, children, children_ages, interest_category, message,
    consent_accepted, consent_at, consent_policy_version, consent_terms_version,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer, page_url, user_agent, idempotency_key, is_test,
    assigned_team_member_id, assignment_reason
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
    left(NULLIF(trim(COALESCE(p_payload->>'consent_policy_version','')), ''), 40),
    left(NULLIF(trim(COALESCE(p_payload->>'consent_terms_version','')), ''), 40),
    left(NULLIF(p_payload->>'utm_source',''), 160),
    left(NULLIF(p_payload->>'utm_medium',''), 160),
    left(NULLIF(p_payload->>'utm_campaign',''), 160),
    left(NULLIF(p_payload->>'utm_content',''), 160),
    left(NULLIF(p_payload->>'utm_term',''), 160),
    left(NULLIF(p_payload->>'referrer',''), 500),
    left(NULLIF(p_payload->>'page_url',''), 500),
    left(NULLIF(p_payload->>'user_agent',''), 300),
    left(NULLIF(p_idempotency_key,''), 120),
    v_is_test, v_assignee, v_reason
  )
  RETURNING id INTO v_lead_id;

  IF v_assignee IS NOT NULL AND v_opp_id IS NOT NULL THEN
    UPDATE public.opportunities SET assigned_team_member_id = v_assignee WHERE id = v_opp_id;
  END IF;

  IF NOT v_is_test THEN
    UPDATE public.agency_product_landings
    SET leads_count = leads_count + 1
    WHERE id = v_landing.id;
  END IF;

  BEGIN
    PERFORM public.enqueue_product_landing_lead_notifications(v_lead_id);
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN json_build_object('success', true, 'lead_id', v_lead_id, 'is_test', v_is_test);
END;
$fn$;