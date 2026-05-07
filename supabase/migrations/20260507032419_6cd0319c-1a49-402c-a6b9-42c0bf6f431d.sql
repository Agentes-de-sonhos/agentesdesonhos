CREATE OR REPLACE FUNCTION public.get_trip_public_branding(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trip_record RECORD;
  agent_profile json;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN json_build_object('error', 'Token inválido');
  END IF;

  SELECT id, user_id, is_locked, client_name
  INTO trip_record
  FROM public.trips
  WHERE share_token = p_token
    AND (share_expires_at IS NULL OR share_expires_at > now());

  IF trip_record IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada ou link expirado');
  END IF;

  SELECT json_build_object(
    'name', p.name,
    'phone', p.phone,
    'avatar_url', p.avatar_url,
    'agency_name', p.agency_name,
    'agency_logo_url', p.agency_logo_url,
    'city', p.city,
    'state', p.state
  )
  INTO agent_profile
  FROM public.profiles p
  WHERE p.user_id = trip_record.user_id;

  RETURN json_build_object(
    'is_locked', COALESCE(trip_record.is_locked, false),
    'agent_profile', agent_profile
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_trip_public_branding(text) TO anon, authenticated;