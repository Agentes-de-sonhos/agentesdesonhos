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

  IF user_plan IN ('premium', 'profissional', 'fundador') THEN
    RETURN true;
  END IF;

  IF user_plan = 'start' THEN
    RETURN _feature IN (
      'news', 'tourism_map', 'agenda', 'trainings_recorded',
      'materials', 'benefits', 'itinerary'
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