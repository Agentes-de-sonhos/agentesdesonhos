
-- Add cartao_digital to subscription_plan enum
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'cartao_digital';

-- Update has_feature_access to handle cartao_digital plan
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
    IF _feature = 'trainings_recorded' THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;
  
  -- Cartão Digital Pass: only business_card access
  IF user_plan = 'cartao_digital' THEN
    IF _feature = 'business_card' THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;
  
  -- Essencial features
  IF _feature IN ('news', 'tourism_map', 'materials', 'agenda', 'crm_basic', 'trainings_recorded', 'financial') THEN
    RETURN true;
  END IF;
  
  -- Profissional features
  IF _feature IN ('ai_tools', 'quote_generator', 'trip_wallet', 'reminders', 'trainings_live') THEN
    RETURN user_plan IN ('profissional', 'premium');
  END IF;
  
  -- Premium features
  IF _feature IN ('ai_unlimited', 'trails_premium', 'certificates', 'ranking', 'premium_group', 'fam_tours', 'community', 'qa_forum') THEN
    RETURN user_plan = 'premium';
  END IF;
  
  RETURN false;
END;
$function$;
