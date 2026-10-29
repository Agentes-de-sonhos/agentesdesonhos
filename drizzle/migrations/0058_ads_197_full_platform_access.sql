CREATE OR REPLACE FUNCTION public.has_feature_access(_user_id uuid, _feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_plan subscription_plan;
BEGIN
  user_plan := get_user_plan(_user_id);

  IF EXISTS (
    SELECT 1 FROM public.user_feature_access
    WHERE user_id = _user_id AND feature_key = _feature
  ) THEN
    RETURN true;
  END IF;

  IF user_plan = 'educa_pass' THEN
    RETURN _feature = 'trainings_recorded';
  END IF;

  IF user_plan = 'cartao_digital' THEN
    RETURN _feature = 'business_card';
  END IF;

  IF user_plan IN ('premium', 'profissional', 'fundador', 'ads_essencial_gestao_equipe') THEN
    RETURN true;
  END IF;

  IF user_plan = 'start' THEN
    RETURN _feature IN (
      'news', 'tourism_map', 'agenda', 'trainings_recorded',
      'materials', 'benefits', 'itinerary', 'content_creator'
    );
  END IF;

  IF _feature IN (
    'news', 'tourism_map', 'materials', 'agenda', 'crm_basic',
    'trainings_recorded', 'financial', 'business_card', 'flight_blocks',
    'qa_forum', 'itinerary', 'quote_generator', 'benefits',
    'notepad', 'showcase', 'lamina_customizer', 'lead_capture',
    'travel_advisor', 'hotel_raio_x'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_ai_usage(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calling_user uuid;
  owner_id uuid;
  user_sub RECORD;
  monthly_limit INTEGER;
BEGIN
  calling_user := auth.uid();
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: autenticação necessária';
  END IF;
  IF _user_id <> calling_user THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify other users AI usage';
  END IF;

  -- Colaborador de equipe consome a assinatura efetiva da conta master.
  SELECT COALESCE(
    (SELECT m.agency_id FROM public.agency_team_members m
      WHERE m.auth_user_id = calling_user AND m.status = 'active'
      ORDER BY m.created_at LIMIT 1),
    calling_user
  ) INTO owner_id;

  SELECT * INTO user_sub FROM public.subscriptions
  WHERE user_id = owner_id AND is_active = true LIMIT 1;

  IF user_sub IS NULL THEN RETURN false; END IF;

  IF user_sub.ai_usage_reset_at <= now() THEN
    UPDATE public.subscriptions
    SET ai_usage_count = 0, ai_usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE id = user_sub.id;
    user_sub.ai_usage_count := 0;
  END IF;

  CASE user_sub.plan
    WHEN 'premium' THEN monthly_limit := 999999;
    WHEN 'promo_grupo_sc' THEN monthly_limit := 999999;
    WHEN 'profissional' THEN monthly_limit := 1000;
    WHEN 'fundador' THEN monthly_limit := 1000;
    WHEN 'ads_essencial_gestao_equipe' THEN monthly_limit := 1000;
    WHEN 'start' THEN monthly_limit := 0;
    WHEN 'essencial' THEN monthly_limit := 0;
    WHEN 'cartao_digital' THEN monthly_limit := 0;
    WHEN 'educa_pass' THEN monthly_limit := 0;
    ELSE monthly_limit := 0;
  END CASE;

  IF user_sub.ai_usage_count >= monthly_limit THEN RETURN false; END IF;

  UPDATE public.subscriptions SET ai_usage_count = ai_usage_count + 1 WHERE id = user_sub.id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION private.reservations_owner_is_eligible(_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
  v_active boolean;
  v_expires timestamptz;
BEGIN
  IF _owner IS NULL THEN RETURN false; END IF;

  -- concessão individual da conta master (Central/CRM básico)
  IF EXISTS (SELECT 1 FROM public.user_feature_access ufa
              WHERE ufa.user_id = _owner AND ufa.feature_key = 'crm_basic') THEN
    RETURN true;
  END IF;

  SELECT s.plan::text, s.is_active, s.expires_at
    INTO v_plan, v_active, v_expires
    FROM public.subscriptions s
   WHERE s.user_id = _owner AND s.is_active = true
   ORDER BY s.updated_at DESC NULLS LAST
   LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN RETURN false; END IF;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN RETURN false; END IF;

  RETURN COALESCE(v_plan, 'start') IN ('premium', 'fundador', 'promo_grupo_sc', 'ads_essencial_gestao_equipe');
END $function$;