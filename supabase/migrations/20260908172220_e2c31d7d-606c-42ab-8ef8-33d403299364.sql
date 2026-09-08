ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_content_locale text NOT NULL DEFAULT 'pt-BR';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_public_content_locale_check
  CHECK (public_content_locale IN ('pt-BR', 'it-IT'));

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE(
  user_id uuid, name text, avatar_url text, agency_name text,
  agency_logo_url text, city text, state text, phone text,
  agency_primary_color text, agency_secondary_color text,
  agency_secondary_auto boolean, agency_tertiary_color text,
  agency_tertiary_auto boolean, public_content_locale text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.avatar_url, p.agency_name,
    p.agency_logo_url, p.city, p.state, p.phone,
    p.agency_primary_color, p.agency_secondary_color,
    COALESCE(p.agency_secondary_auto, true),
    p.agency_tertiary_color,
    COALESCE(p.agency_tertiary_auto, true),
    COALESCE(p.public_content_locale, 'pt-BR')
  FROM public.profiles p WHERE p.user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.build_public_quote_payload(p_quote quotes)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  agent_record RECORD;
  services_data json;
  sections_data json;
  groups_data json;
  extras_data json;
  quote_json jsonb;
  v_agency uuid;
  v_booking_enabled boolean := false;
BEGIN
  SELECT * INTO agent_record FROM public.profiles WHERE user_id = p_quote.user_id;
  IF agent_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.quote_services s WHERE s.quote_id = p_quote.id;

  SELECT json_agg(json_build_object(
    'id', sec.id, 'quote_id', sec.quote_id,
    'title', sec.title, 'order_index', sec.order_index,
    'destination', sec.destination,
    'start_date', sec.start_date,
    'end_date', sec.end_date,
    'service_type', sec.service_type
  ) ORDER BY sec.order_index) INTO sections_data
  FROM public.quote_sections sec WHERE sec.quote_id = p_quote.id;

  SELECT json_agg(json_build_object(
    'id', g.id, 'title', g.title, 'group_type', g.group_type,
    'min_select', g.min_select, 'max_select', g.max_select,
    'order_index', g.order_index
  ) ORDER BY g.order_index) INTO groups_data
  FROM public.quote_service_choice_groups g WHERE g.quote_id = p_quote.id;

  SELECT json_agg(row_to_json(e) ORDER BY e.sort_order) INTO extras_data
  FROM public.quote_entry_extras e WHERE e.quote_id = p_quote.id;

  IF COALESCE(p_quote.booking_requests_enabled, false) THEN
    v_agency := public.resolve_agency_id_for_user(p_quote.user_id);
    v_booking_enabled := public.agency_can_use_booking_requests(v_agency);
  END IF;

  -- Nunca expor token de compartilhamento nem ids internos ao navegador.
  quote_json := (to_jsonb(p_quote) - 'client_id' - 'share_token' - 'user_id')
    || jsonb_build_object(
         'booking_requests_enabled', v_booking_enabled,
         'has_linked_client', p_quote.client_id IS NOT NULL
       );

  RETURN json_build_object(
    'quote', quote_json,
    'services', COALESCE(services_data, '[]'::json),
    'sections', COALESCE(sections_data, '[]'::json),
    'choice_groups', COALESCE(groups_data, '[]'::json),
    'entry_extras', COALESCE(extras_data, '[]'::json),
    'agent_profile', json_build_object(
      'name', agent_record.name, 'phone', agent_record.phone,
      'avatar_url', agent_record.avatar_url,
      'agency_name', agent_record.agency_name,
      'agency_logo_url', agent_record.agency_logo_url,
      'city', agent_record.city, 'state', agent_record.state,
      'public_content_locale', COALESCE(agent_record.public_content_locale, 'pt-BR')
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_itinerary_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'city', agent_record.city, 'state', agent_record.state,
    'public_content_locale', COALESCE(agent_record.public_content_locale, 'pt-BR')
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

CREATE OR REPLACE FUNCTION public.get_trip_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE trip_record RECORD; agent_record RECORD; services_data json; agent_profile json; wallet_settings json; agency_slug_check text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 16 THEN RETURN json_build_object('error', 'Link inválido'); END IF;
  SELECT * INTO trip_record FROM public.trips WHERE public_access_code = p_code;
  IF trip_record IS NULL THEN RETURN json_build_object('error', 'Carteira não encontrada'); END IF;
  SELECT * INTO agent_record FROM public.profiles WHERE user_id = trip_record.user_id;
  IF agent_record IS NULL THEN RETURN json_build_object('error', 'Carteira não encontrada'); END IF;
  agency_slug_check := lower(public.unaccent(COALESCE(agent_record.agency_name, '')));
  agency_slug_check := regexp_replace(agency_slug_check, '[^a-z0-9\-]', '-', 'g');
  agency_slug_check := regexp_replace(agency_slug_check, '-+', '-', 'g');
  agency_slug_check := trim(both '-' from agency_slug_check);
  IF agency_slug_check != p_agency_slug THEN RETURN json_build_object('error', 'Carteira não encontrada'); END IF;
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

CREATE OR REPLACE FUNCTION public.get_trip_public_branding(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'agency_primary_color', p.agency_primary_color,
    'public_content_locale', COALESCE(p.public_content_locale, 'pt-BR')
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