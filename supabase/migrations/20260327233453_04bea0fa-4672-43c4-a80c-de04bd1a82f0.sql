
-- 1. Fix user_roles: remove any remaining permissive INSERT policies
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "users_insert_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;

-- Only admins can manually insert roles (auto-creation handled by trigger)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix survey_responses unrestricted UPDATE
DROP POLICY IF EXISTS "Authenticated users can update responses" ON public.survey_responses;

-- 3. Fix trip access_password exposure: update RPC functions to never return raw password
CREATE OR REPLACE FUNCTION public.verify_trip_access_by_slug(p_slug text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_record RECORD;
  services_data json;
  agent_profile json;
BEGIN
  IF p_slug IS NULL OR length(p_slug) < 3 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;
  SELECT * INTO trip_record FROM public.trips WHERE slug = p_slug;
  IF trip_record IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;
  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    RETURN json_build_object('error', 'Senha incorreta');
  END IF;
  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.trip_services s WHERE s.trip_id = trip_record.id;
  SELECT json_build_object(
    'name', p.name, 'phone', p.phone, 'avatar_url', p.avatar_url,
    'agency_name', p.agency_name, 'agency_logo_url', p.agency_logo_url,
    'city', p.city, 'state', p.state
  ) INTO agent_profile FROM public.profiles p WHERE p.user_id = trip_record.user_id;
  RETURN json_build_object(
    'trip', json_build_object(
      'id', trip_record.id, 'client_name', trip_record.client_name,
      'destination', trip_record.destination, 'start_date', trip_record.start_date,
      'end_date', trip_record.end_date, 'status', trip_record.status,
      'created_at', trip_record.created_at, 'share_token', trip_record.share_token,
      'slug', trip_record.slug,
      'has_password', (trip_record.access_password IS NOT NULL)
    ),
    'services', COALESCE(services_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_trip_access(p_token text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_record RECORD;
  services_data json;
  agent_profile json;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN json_build_object('error', 'Token inválido');
  END IF;
  SELECT * INTO trip_record
  FROM public.trips
  WHERE share_token = p_token
    AND (share_expires_at IS NULL OR share_expires_at > now());
  IF trip_record IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada ou link expirado');
  END IF;
  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    RETURN json_build_object('error', 'Senha incorreta');
  END IF;
  SELECT json_agg(row_to_json(s) ORDER BY s.order_index)
  INTO services_data
  FROM public.trip_services s
  WHERE s.trip_id = trip_record.id;
  SELECT json_build_object(
    'name', p.name, 'phone', p.phone, 'avatar_url', p.avatar_url,
    'agency_name', p.agency_name, 'agency_logo_url', p.agency_logo_url,
    'city', p.city, 'state', p.state
  )
  INTO agent_profile
  FROM public.profiles p
  WHERE p.user_id = trip_record.user_id;
  RETURN json_build_object(
    'trip', json_build_object(
      'id', trip_record.id, 'client_name', trip_record.client_name,
      'destination', trip_record.destination, 'start_date', trip_record.start_date,
      'end_date', trip_record.end_date, 'status', trip_record.status,
      'created_at', trip_record.created_at,
      'has_password', (trip_record.access_password IS NOT NULL)
    ),
    'services', COALESCE(services_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$$;

-- Drop permissive public select policy on trips that exposes access_password
DROP POLICY IF EXISTS "Public can view shared trips with valid token" ON public.trips;
