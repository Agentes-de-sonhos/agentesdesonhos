
-- 1. Add public_access_code column to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS public_access_code text UNIQUE;

-- 2. Create function to generate secure 20-char access code
CREATE OR REPLACE FUNCTION public.generate_public_access_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..20 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trips WHERE public_access_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Update auto_generate_trip_slugs trigger to also generate public_access_code
CREATE OR REPLACE FUNCTION public.auto_generate_trip_slugs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := public.generate_trip_slug(NEW.client_name, NEW.destination, NEW.start_date);
  END IF;
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_trip_short_code();
  END IF;
  IF NEW.public_access_code IS NULL THEN
    NEW.public_access_code := public.generate_public_access_code();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create RPC to get trip by public code + agency slug
CREATE OR REPLACE FUNCTION public.get_trip_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_record RECORD;
  agent_record RECORD;
  services_data json;
  agent_profile json;
  agency_slug_check text;
BEGIN
  -- Validate inputs
  IF p_code IS NULL OR length(p_code) < 16 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  -- Find trip by public_access_code
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

  -- Generate slug from agency name and compare
  agency_slug_check := lower(public.unaccent(COALESCE(agent_record.agency_name, '')));
  agency_slug_check := regexp_replace(agency_slug_check, '[^a-z0-9\-]', '-', 'g');
  agency_slug_check := regexp_replace(agency_slug_check, '-+', '-', 'g');
  agency_slug_check := trim(both '-' from agency_slug_check);

  IF agency_slug_check != p_agency_slug THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;

  -- Get services
  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.trip_services s WHERE s.trip_id = trip_record.id;

  -- Build agent profile
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
$$;

-- 5. Create RPC to verify trip access by public code (with password)
CREATE OR REPLACE FUNCTION public.verify_trip_by_public_code(p_agency_slug text, p_code text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Check password
  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    RETURN json_build_object('error', 'Senha incorreta');
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
$$;

-- 6. Create helper to get agency slug from user_id
CREATE OR REPLACE FUNCTION public.get_agency_slug_for_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    trim(both '-' from 
      regexp_replace(
        regexp_replace(
          lower(public.unaccent(COALESCE(agency_name, ''))),
          '[^a-z0-9\-]', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    )
  FROM public.profiles
  WHERE user_id = p_user_id;
$$;
