-- Add 'start' and 'premium' to subscription_plan enum
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'start';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'premium';

-- Update check_ai_usage to handle new plans
CREATE OR REPLACE FUNCTION public.check_ai_usage(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calling_user uuid;
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

  SELECT * INTO user_sub FROM public.subscriptions 
  WHERE user_id = calling_user AND is_active = true LIMIT 1;
  
  IF user_sub IS NULL THEN RETURN false; END IF;
  
  IF user_sub.ai_usage_reset_at <= now() THEN
    UPDATE public.subscriptions 
    SET ai_usage_count = 0, ai_usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE id = user_sub.id;
    user_sub.ai_usage_count := 0;
  END IF;
  
  CASE user_sub.plan
    WHEN 'premium' THEN monthly_limit := 999999;
    WHEN 'profissional' THEN monthly_limit := 1000;
    WHEN 'fundador' THEN monthly_limit := 1000;
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

-- Update has_feature_access for new plans
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
  
  IF user_plan = 'educa_pass' THEN
    RETURN _feature = 'trainings_recorded';
  END IF;
  
  IF user_plan = 'cartao_digital' THEN
    RETURN _feature = 'business_card';
  END IF;
  
  -- Premium, Fundador and Profissional get everything
  IF user_plan IN ('premium', 'profissional', 'fundador') THEN
    RETURN true;
  END IF;
  
  -- Start plan features
  IF user_plan = 'start' THEN
    RETURN _feature IN ('news', 'tourism_map', 'agenda', 'trainings_recorded');
  END IF;
  
  -- Essencial features
  IF _feature IN ('news', 'tourism_map', 'materials', 'agenda', 'crm_basic', 'trainings_recorded', 'financial', 'business_card', 'flight_blocks', 'qa_forum', 'itinerary', 'quote_generator') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Update get_online_premium_users to include premium plan
CREATE OR REPLACE FUNCTION public.get_online_premium_users(_exclude_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, name text, avatar_url text, agency_name text, city text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    COALESCE(p.name, 'Agente')::text AS name,
    p.avatar_url::text,
    p.agency_name::text,
    p.city::text
  FROM public.user_presence up
  INNER JOIN public.profiles p ON p.user_id = up.user_id
  INNER JOIN public.subscriptions s ON s.user_id = up.user_id
    AND s.plan IN ('premium', 'profissional', 'fundador')
    AND s.is_active = true
  WHERE up.is_online = true
    AND up.last_active_at >= (now() - interval '5 minutes')
    AND (up.user_id != _exclude_user_id OR _exclude_user_id IS NULL);
$function$;

-- Update handle_new_user_subscription to default to 'start'
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_plan subscription_plan;
BEGIN
  target_plan := COALESCE(
    (NEW.raw_user_meta_data->>'target_plan')::subscription_plan,
    'start'::subscription_plan
  );
  
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (NEW.id, target_plan);
  RETURN NEW;
END;
$function$;