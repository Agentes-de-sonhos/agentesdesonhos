
CREATE OR REPLACE FUNCTION public.has_feature_access(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_plan subscription_plan;
BEGIN
  user_plan := get_user_plan(_user_id);
  
  -- Essencial features
  IF _feature IN ('news', 'tourism_map', 'materials', 'agenda', 'crm_basic', 'trainings_recorded') THEN
    RETURN true;
  END IF;
  
  -- Profissional features
  IF _feature IN ('ai_tools', 'quote_generator', 'trip_wallet', 'reminders', 'financial', 'trainings_live') THEN
    RETURN user_plan IN ('profissional', 'premium');
  END IF;
  
  -- Premium features
  IF _feature IN ('ai_unlimited', 'trails_premium', 'certificates', 'ranking', 'premium_group', 'fam_tours', 'community', 'qa_forum') THEN
    RETURN user_plan = 'premium';
  END IF;
  
  RETURN false;
END;
$$;
