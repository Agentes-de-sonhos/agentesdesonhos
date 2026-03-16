
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
  
  -- Educa Pass: only trainings_recorded (academy access)
  IF user_plan = 'educa_pass' THEN
    RETURN _feature = 'trainings_recorded';
  END IF;
  
  -- Cartão Digital Pass: only business_card access
  IF user_plan = 'cartao_digital' THEN
    RETURN _feature = 'business_card';
  END IF;
  
  -- Profissional gets everything
  IF user_plan = 'profissional' THEN
    RETURN true;
  END IF;
  
  -- Essencial features
  IF _feature IN ('news', 'tourism_map', 'materials', 'agenda', 'crm_basic', 'trainings_recorded', 'financial', 'business_card', 'flight_blocks', 'qa_forum', 'itinerary', 'quote_generator') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Also update check_ai_usage to remove premium references
CREATE OR REPLACE FUNCTION public.check_ai_usage(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_sub RECORD;
  monthly_limit INTEGER;
BEGIN
  IF _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify other users AI usage';
  END IF;

  SELECT * INTO user_sub FROM public.subscriptions 
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
  
  IF user_sub IS NULL THEN
    RETURN false;
  END IF;
  
  IF user_sub.ai_usage_reset_at <= now() THEN
    UPDATE public.subscriptions 
    SET ai_usage_count = 0,
        ai_usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE id = user_sub.id;
    user_sub.ai_usage_count := 0;
  END IF;
  
  CASE user_sub.plan
    WHEN 'essencial' THEN monthly_limit := 0;
    WHEN 'profissional' THEN monthly_limit := 1000;
    ELSE monthly_limit := 0;
  END CASE;
  
  IF user_sub.ai_usage_count >= monthly_limit THEN
    RETURN false;
  END IF;
  
  UPDATE public.subscriptions 
  SET ai_usage_count = ai_usage_count + 1
  WHERE id = user_sub.id;
  
  RETURN true;
END;
$function$;
