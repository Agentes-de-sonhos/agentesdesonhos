ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS passengers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update RPC to expose only safe passenger info publicly (names/age + aggregated interests)
CREATE OR REPLACE FUNCTION public.get_itinerary_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  itin_record RECORD;
  agent_record RECORD;
  agent_profile json;
  agency_slug_check text;
  public_passengers json;
  passenger_interests text[];
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

  -- Sanitize passengers for public exposure: only name + age
  SELECT COALESCE(json_agg(jsonb_build_object('name', p->>'name', 'age', p->'age') ORDER BY ord), '[]'::json)
  INTO public_passengers
  FROM jsonb_array_elements(COALESCE(itin_record.passengers, '[]'::jsonb)) WITH ORDINALITY AS t(p, ord);

  -- Aggregate distinct interests across all passengers (for profile display)
  SELECT COALESCE(array_agg(DISTINCT i), ARRAY[]::text[])
  INTO passenger_interests
  FROM jsonb_array_elements(COALESCE(itin_record.passengers, '[]'::jsonb)) AS p,
       jsonb_array_elements_text(COALESCE(p->'interests', '[]'::jsonb)) AS i;

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
      'created_at', itin_record.created_at,
      'cover_image_url', itin_record.cover_image_url,
      'destination_intro_text', itin_record.destination_intro_text,
      'destination_intro_images', itin_record.destination_intro_images,
      'show_destination_intro', itin_record.show_destination_intro,
      'passengers', public_passengers,
      'passenger_interests', passenger_interests
    ),
    'agent_profile', agent_profile
  );
END;
$function$;