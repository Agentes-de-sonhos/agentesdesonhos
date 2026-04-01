
-- Add public_access_code to itineraries table
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS public_access_code text UNIQUE;

-- Function to generate unique itinerary access code
CREATE OR REPLACE FUNCTION public.generate_itinerary_access_code()
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
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.itineraries WHERE public_access_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-generate public_access_code for new itineraries
CREATE OR REPLACE FUNCTION public.auto_generate_itinerary_access_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.public_access_code IS NULL THEN
    NEW.public_access_code := public.generate_itinerary_access_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_itinerary_access_code ON public.itineraries;
CREATE TRIGGER trg_auto_generate_itinerary_access_code
  BEFORE INSERT ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_itinerary_access_code();

-- RPC to get itinerary by public code
CREATE OR REPLACE FUNCTION public.get_itinerary_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itin_record RECORD;
  agent_record RECORD;
  days_data json;
  agent_profile json;
  agency_slug_check text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO itin_record
  FROM public.itineraries
  WHERE public_access_code = p_code
    AND status = 'published';

  IF itin_record IS NULL THEN
    RETURN json_build_object('error', 'Roteiro não encontrado');
  END IF;

  SELECT * INTO agent_record
  FROM public.profiles
  WHERE user_id = itin_record.user_id;

  IF agent_record IS NULL THEN
    RETURN json_build_object('error', 'Roteiro não encontrado');
  END IF;

  agency_slug_check := lower(public.unaccent(COALESCE(agent_record.agency_name, '')));
  agency_slug_check := regexp_replace(agency_slug_check, '[^a-z0-9\-]', '-', 'g');
  agency_slug_check := regexp_replace(agency_slug_check, '-+', '-', 'g');
  agency_slug_check := trim(both '-' from agency_slug_check);

  IF agency_slug_check != p_agency_slug THEN
    RETURN json_build_object('error', 'Roteiro não encontrado');
  END IF;

  agent_profile := json_build_object(
    'name', agent_record.name, 'phone', agent_record.phone,
    'avatar_url', agent_record.avatar_url,
    'agency_name', agent_record.agency_name,
    'agency_logo_url', agent_record.agency_logo_url,
    'city', agent_record.city, 'state', agent_record.state
  );

  RETURN json_build_object(
    'itinerary', json_build_object(
      'id', itin_record.id,
      'destination', itin_record.destination,
      'start_date', itin_record.start_date,
      'end_date', itin_record.end_date,
      'travelers_count', itin_record.travelers_count,
      'trip_type', itin_record.trip_type,
      'budget_level', itin_record.budget_level,
      'status', itin_record.status,
      'share_token', itin_record.share_token,
      'public_access_code', itin_record.public_access_code,
      'user_id', itin_record.user_id,
      'created_at', itin_record.created_at
    ),
    'agent_profile', agent_profile
  );
END;
$$;
