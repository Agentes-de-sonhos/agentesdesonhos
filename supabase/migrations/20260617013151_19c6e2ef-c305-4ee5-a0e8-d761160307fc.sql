ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_primary_color text;

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE(user_id uuid, name text, avatar_url text, agency_name text, agency_logo_url text, city text, state text, phone text, agency_primary_color text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.name, p.avatar_url, p.agency_name,
    p.agency_logo_url, p.city, p.state, p.phone, p.agency_primary_color
  FROM public.profiles p WHERE p.user_id = _user_id;
$function$;

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
    'state', p.state,
    'agency_primary_color', p.agency_primary_color
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