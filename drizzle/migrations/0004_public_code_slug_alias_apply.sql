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

  IF NOT public.public_slug_alias_matches(itin_record.user_id, p_agency_slug) THEN
    RETURN json_build_object('error', 'Roteiro não encontrado');
  END IF;

  agent_profile := json_build_object(
    'name', agent_record.name, 'phone', agent_record.phone,
    'avatar_url', agent_record.avatar_url,
    'agency_name', agent_record.agency_name,
    'agency_logo_url', agent_record.agency_logo_url,
    'city', agent_record.city, 'state', agent_record.state,
    'public_content_locale', COALESCE(agent_record.public_content_locale, 'pt-BR')
  );

  SELECT COALESCE(json_agg(jsonb_build_object('name', p->>'name', 'age', p->'age') ORDER BY ord), '[]'::json)
  INTO public_passengers
  FROM jsonb_array_elements(COALESCE(itin_record.passengers, '[]'::jsonb)) WITH ORDINALITY AS t(p, ord);

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

CREATE OR REPLACE FUNCTION public.get_trip_by_public_code(p_agency_slug text, p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE trip_record RECORD; agent_record RECORD; services_data json; agent_profile json; wallet_settings json;
BEGIN
  IF p_code IS NULL OR length(p_code) < 16 THEN RETURN json_build_object('error', 'Link inválido'); END IF;
  SELECT * INTO trip_record FROM public.trips WHERE public_access_code = p_code;
  IF trip_record IS NULL THEN RETURN json_build_object('error', 'Carteira não encontrada'); END IF;
  SELECT * INTO agent_record FROM public.profiles WHERE user_id = trip_record.user_id;
  IF agent_record IS NULL THEN RETURN json_build_object('error', 'Carteira não encontrada'); END IF;
  IF NOT public.public_slug_alias_matches(trip_record.user_id, p_agency_slug) THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;
  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data FROM public.trip_services s WHERE s.trip_id = trip_record.id;
  agent_profile := json_build_object('name', agent_record.name, 'phone', agent_record.phone,
    'avatar_url', agent_record.avatar_url, 'agency_name', agent_record.agency_name,
    'agency_logo_url', agent_record.agency_logo_url, 'city', agent_record.city, 'state', agent_record.state,
    'agency_primary_color', agent_record.agency_primary_color,
    'public_content_locale', COALESCE(agent_record.public_content_locale, 'pt-BR'));
  SELECT row_to_json(w) INTO wallet_settings FROM public.get_agency_wallet_settings(trip_record.user_id) w;
  RETURN json_build_object('trip', json_build_object(
    'id', trip_record.id, 'user_id', trip_record.user_id, 'client_name', trip_record.client_name, 'trip_title', trip_record.trip_title,
    'destination', trip_record.destination, 'start_date', trip_record.start_date, 'end_date', trip_record.end_date,
    'status', trip_record.status, 'created_at', trip_record.created_at, 'share_token', trip_record.share_token,
    'slug', trip_record.slug, 'public_access_code', trip_record.public_access_code,
    'itinerary_id', trip_record.itinerary_id, 'itinerary_mode', trip_record.itinerary_mode,
    'has_password', (trip_record.access_password IS NOT NULL),
    'signature_snapshot', trip_record.signature_snapshot,
    'wallet_settings', wallet_settings
  ), 'services', COALESCE(services_data, '[]'::json), 'agent_profile', agent_profile);
END;
$function$;
