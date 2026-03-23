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
  
  IF user_plan = 'educa_pass' THEN
    RETURN _feature = 'trainings_recorded';
  END IF;
  
  IF user_plan = 'cartao_digital' THEN
    RETURN _feature = 'business_card';
  END IF;
  
  -- Fundador and Profissional get everything
  IF user_plan IN ('profissional', 'fundador') THEN
    RETURN true;
  END IF;
  
  -- Essencial features
  IF _feature IN ('news', 'tourism_map', 'materials', 'agenda', 'crm_basic', 'trainings_recorded', 'financial', 'business_card', 'flight_blocks', 'qa_forum', 'itinerary', 'quote_generator') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;