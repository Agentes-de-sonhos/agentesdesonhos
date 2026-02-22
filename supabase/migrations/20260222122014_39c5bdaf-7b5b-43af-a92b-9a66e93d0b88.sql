
-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add slug and short_code columns
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS short_code text UNIQUE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trips_slug ON public.trips (slug);
CREATE INDEX IF NOT EXISTS idx_trips_short_code ON public.trips (short_code);

-- Function to generate short code
CREATE OR REPLACE FUNCTION public.generate_trip_short_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trips WHERE short_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to generate slug
CREATE OR REPLACE FUNCTION public.generate_trip_slug(
  p_client_name text,
  p_destination text,
  p_start_date date
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(public.unaccent(p_client_name || ' ' || p_destination || ' ' || EXTRACT(YEAR FROM p_start_date)::text));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 60);
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.trips WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$;

-- Auto-generate trigger
CREATE OR REPLACE FUNCTION public.auto_generate_trip_slugs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := public.generate_trip_slug(NEW.client_name, NEW.destination, NEW.start_date);
  END IF;
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_trip_short_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_auto_slug ON public.trips;
CREATE TRIGGER trip_auto_slug
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_trip_slugs();

-- Backfill existing trips
DO $$
DECLARE
  r RECORD;
  new_slug text;
  new_code text;
BEGIN
  FOR r IN SELECT id, client_name, destination, start_date FROM public.trips WHERE slug IS NULL LOOP
    new_slug := public.generate_trip_slug(r.client_name, r.destination, r.start_date);
    new_code := public.generate_trip_short_code();
    UPDATE public.trips SET slug = new_slug, short_code = new_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- Slug-based access verification RPC
CREATE OR REPLACE FUNCTION public.verify_trip_access_by_slug(p_slug text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'created_at', trip_record.created_at
    ),
    'services', COALESCE(services_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$$;

-- Short code resolver RPC
CREATE OR REPLACE FUNCTION public.resolve_trip_short_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_slug text;
BEGIN
  SELECT slug INTO trip_slug FROM public.trips WHERE short_code = p_code;
  IF trip_slug IS NULL THEN
    RETURN json_build_object('error', 'Link não encontrado');
  END IF;
  RETURN json_build_object('slug', trip_slug);
END;
$$;

-- RLS policy for public slug access
CREATE POLICY "Public can view trips by slug"
  ON public.trips FOR SELECT
  USING (slug IS NOT NULL AND length(slug) >= 3);
