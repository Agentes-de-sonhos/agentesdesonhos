
-- Add lockout fields to trips
ALTER TABLE public.trips 
  ADD COLUMN IF NOT EXISTS failed_password_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Update verify_trip_by_public_code with lockout logic
CREATE OR REPLACE FUNCTION public.verify_trip_by_public_code(p_agency_slug text, p_code text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip_record RECORD;
  agent_record RECORD;
  services_data json;
  agent_profile json;
  agency_slug_check text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 16 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO trip_record
  FROM public.trips
  WHERE public_access_code = p_code;

  IF trip_record IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;

  -- Get agent profile and validate agency slug
  SELECT * INTO agent_record
  FROM public.profiles
  WHERE user_id = trip_record.user_id;

  IF agent_record IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;

  agency_slug_check := lower(public.unaccent(COALESCE(agent_record.agency_name, '')));
  agency_slug_check := regexp_replace(agency_slug_check, '[^a-z0-9\-]', '-', 'g');
  agency_slug_check := regexp_replace(agency_slug_check, '-+', '-', 'g');
  agency_slug_check := trim(both '-' from agency_slug_check);

  IF agency_slug_check != p_agency_slug THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;

  -- Check if locked
  IF trip_record.is_locked = true THEN
    RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
  END IF;

  -- Check password
  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    -- Increment failed attempts
    UPDATE public.trips
    SET failed_password_attempts = failed_password_attempts + 1,
        is_locked = CASE WHEN failed_password_attempts + 1 >= 3 THEN true ELSE false END
    WHERE id = trip_record.id;

    IF trip_record.failed_password_attempts + 1 >= 3 THEN
      RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
    END IF;

    RETURN json_build_object('error', 'Senha inválida');
  END IF;

  -- Password correct: reset attempts
  IF trip_record.failed_password_attempts > 0 THEN
    UPDATE public.trips SET failed_password_attempts = 0 WHERE id = trip_record.id;
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.trip_services s WHERE s.trip_id = trip_record.id;

  agent_profile := json_build_object(
    'name', agent_record.name, 'phone', agent_record.phone,
    'avatar_url', agent_record.avatar_url,
    'agency_name', agent_record.agency_name,
    'agency_logo_url', agent_record.agency_logo_url,
    'city', agent_record.city, 'state', agent_record.state
  );

  RETURN json_build_object(
    'trip', json_build_object(
      'id', trip_record.id, 'client_name', trip_record.client_name,
      'destination', trip_record.destination, 'start_date', trip_record.start_date,
      'end_date', trip_record.end_date, 'status', trip_record.status,
      'created_at', trip_record.created_at, 'share_token', trip_record.share_token,
      'slug', trip_record.slug, 'public_access_code', trip_record.public_access_code,
      'has_password', (trip_record.access_password IS NOT NULL)
    ),
    'services', COALESCE(services_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$function$;

-- Update verify_trip_access_by_slug with same lockout logic
CREATE OR REPLACE FUNCTION public.verify_trip_access_by_slug(p_slug text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Check if locked
  IF trip_record.is_locked = true THEN
    RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
  END IF;

  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    UPDATE public.trips
    SET failed_password_attempts = failed_password_attempts + 1,
        is_locked = CASE WHEN failed_password_attempts + 1 >= 3 THEN true ELSE false END
    WHERE id = trip_record.id;

    IF trip_record.failed_password_attempts + 1 >= 3 THEN
      RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
    END IF;

    RETURN json_build_object('error', 'Senha inválida');
  END IF;

  -- Password correct: reset attempts
  IF trip_record.failed_password_attempts > 0 THEN
    UPDATE public.trips SET failed_password_attempts = 0 WHERE id = trip_record.id;
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
$function$;

-- Update verify_trip_access (token-based) with same lockout logic
CREATE OR REPLACE FUNCTION public.verify_trip_access(p_token text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Check if locked
  IF trip_record.is_locked = true THEN
    RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
  END IF;

  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    UPDATE public.trips
    SET failed_password_attempts = failed_password_attempts + 1,
        is_locked = CASE WHEN failed_password_attempts + 1 >= 3 THEN true ELSE false END
    WHERE id = trip_record.id;

    IF trip_record.failed_password_attempts + 1 >= 3 THEN
      RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
    END IF;

    RETURN json_build_object('error', 'Senha inválida');
  END IF;

  -- Password correct: reset attempts
  IF trip_record.failed_password_attempts > 0 THEN
    UPDATE public.trips SET failed_password_attempts = 0 WHERE id = trip_record.id;
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
$function$;
