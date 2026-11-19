ALTER TABLE public.itinerary_days ADD COLUMN IF NOT EXISTS city text;

CREATE OR REPLACE FUNCTION public.clone_itinerary_for_trip(p_source_itinerary_id uuid, p_trip_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_source itineraries%ROWTYPE;
  v_trip trips%ROWTYPE;
  v_new_id uuid;
  v_day RECORD;
  v_new_day_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_source FROM public.itineraries WHERE id = p_source_itinerary_id;
  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'Roteiro de origem não encontrado';
  END IF;
  IF v_source.user_id <> v_caller THEN
    RAISE EXCEPTION 'Sem permissão sobre o roteiro de origem';
  END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;
  IF v_trip.user_id <> v_caller THEN
    RAISE EXCEPTION 'Sem permissão sobre a carteira';
  END IF;

  INSERT INTO public.itineraries (
    user_id, destination, start_date, end_date, travelers_count,
    trip_type, budget_level, status, share_token, share_expires_at,
    client_id, public_access_code, cover_image_url,
    destination_intro_text, destination_intro_images, show_destination_intro,
    passengers, source_itinerary_id,
    show_pricing_section, pricing_content
  ) VALUES (
    v_caller, v_source.destination, v_source.start_date, v_source.end_date,
    v_source.travelers_count, v_source.trip_type, v_source.budget_level,
    'draft', NULL, NULL,
    v_trip.client_id, NULL,
    v_source.cover_image_url,
    v_source.destination_intro_text, v_source.destination_intro_images,
    v_source.show_destination_intro, v_source.passengers,
    v_source.id,
    v_source.show_pricing_section, v_source.pricing_content
  )
  RETURNING id INTO v_new_id;

  FOR v_day IN
    SELECT * FROM public.itinerary_days
    WHERE itinerary_id = p_source_itinerary_id
    ORDER BY day_number
  LOOP
    INSERT INTO public.itinerary_days (itinerary_id, day_number, date, city)
    VALUES (v_new_id, v_day.day_number, v_day.date, v_day.city)
    RETURNING id INTO v_new_day_id;

    INSERT INTO public.itinerary_activities (
      day_id, period, title, description, location,
      estimated_duration, estimated_cost, order_index,
      is_approved, photo_url, document_urls
    )
    SELECT
      v_new_day_id, period, title, description, location,
      estimated_duration, estimated_cost, order_index,
      is_approved, photo_url, document_urls
    FROM public.itinerary_activities
    WHERE day_id = v_day.id
    ORDER BY order_index;
  END LOOP;

  RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_itinerary_by_share_token(p_share_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_itinerary public.itineraries%ROWTYPE;
  v_days jsonb;
  v_period_images jsonb;
BEGIN
  IF p_share_token IS NULL OR length(p_share_token) < 32 THEN
    RETURN jsonb_build_object('error', 'Roteiro não encontrado');
  END IF;

  SELECT i.*
    INTO v_itinerary
    FROM public.itineraries i
   WHERE i.share_token = p_share_token
     AND i.status = 'published'
     AND (i.share_expires_at IS NULL OR i.share_expires_at > now())
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Roteiro não encontrado');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'itinerary_id', d.itinerary_id,
        'day_number', d.day_number,
        'date', d.date,
        'city', d.city,
        'created_at', d.created_at,
        'updated_at', d.updated_at,
        'activities', COALESCE((
          SELECT jsonb_agg(to_jsonb(a) ORDER BY a.order_index)
            FROM public.itinerary_activities a
           WHERE a.day_id = d.id
        ), '[]'::jsonb)
      ) ORDER BY d.day_number
    ),
    '[]'::jsonb
  )
    INTO v_days
    FROM public.itinerary_days d
   WHERE d.itinerary_id = v_itinerary.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(pi) ORDER BY pi.day_date, pi.period), '[]'::jsonb)
    INTO v_period_images
    FROM public.itinerary_period_images pi
   WHERE pi.itinerary_id = v_itinerary.id;

  RETURN jsonb_build_object(
    'itinerary', jsonb_build_object(
      'id', v_itinerary.id,
      'user_id', v_itinerary.user_id,
      'destination', v_itinerary.destination,
      'start_date', v_itinerary.start_date,
      'end_date', v_itinerary.end_date,
      'travelers_count', v_itinerary.travelers_count,
      'trip_type', v_itinerary.trip_type,
      'budget_level', v_itinerary.budget_level,
      'status', v_itinerary.status,
      'share_token', v_itinerary.share_token,
      'public_access_code', v_itinerary.public_access_code,
      'created_at', v_itinerary.created_at,
      'updated_at', v_itinerary.updated_at,
      'cover_image_url', v_itinerary.cover_image_url,
      'destination_intro_text', v_itinerary.destination_intro_text,
      'destination_intro_images', v_itinerary.destination_intro_images,
      'show_destination_intro', v_itinerary.show_destination_intro,
      'passengers', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('name', p.item->>'name', 'age', p.item->'age') ORDER BY p.ord)
          FROM jsonb_array_elements(COALESCE(v_itinerary.passengers, '[]'::jsonb)) WITH ORDINALITY AS p(item, ord)
      ), '[]'::jsonb),
      'headline', v_itinerary.headline,
      'show_pricing_section', v_itinerary.show_pricing_section,
      'pricing_content', v_itinerary.pricing_content,
      'signature_snapshot', v_itinerary.signature_snapshot
    ),
    'days', v_days,
    'period_images', v_period_images
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_trip_itinerary_v2(p_trip_id uuid, p_access_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trip trips%ROWTYPE;
  v_itin itineraries%ROWTYPE;
  v_days json;
  v_period_images json;
BEGIN
  IF p_access_code IS NULL OR length(p_access_code) < 8 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO v_trip FROM public.trips
  WHERE id = p_trip_id AND public_access_code = p_access_code;

  IF v_trip.id IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;

  IF v_trip.itinerary_mode <> 'v2' OR v_trip.itinerary_id IS NULL THEN
    RETURN json_build_object('itinerary', NULL);
  END IF;

  SELECT * INTO v_itin FROM public.itineraries WHERE id = v_trip.itinerary_id;
  IF v_itin.id IS NULL THEN
    RETURN json_build_object('itinerary', NULL);
  END IF;

  SELECT COALESCE(json_agg(d ORDER BY day_number), '[]'::json) INTO v_days
  FROM (
    SELECT
      d.id, d.day_number, d.date, d.city,
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', a.id, 'period', a.period, 'title', a.title,
            'description', a.description, 'location', a.location,
            'estimated_duration', a.estimated_duration,
            'estimated_cost', a.estimated_cost,
            'order_index', a.order_index,
            'photo_url', a.photo_url,
            'document_urls', a.document_urls,
            'linked_trip_service_id', a.linked_trip_service_id
          ) ORDER BY a.order_index
        )
        FROM public.itinerary_activities a
        WHERE a.day_id = d.id
      ), '[]'::json) AS activities
    FROM public.itinerary_days d
    WHERE d.itinerary_id = v_itin.id
    ORDER BY d.day_number
  ) d;

  SELECT COALESCE(json_agg(json_build_object(
    'day_date', day_date, 'period', period, 'image_url', image_url
  )), '[]'::json) INTO v_period_images
  FROM public.itinerary_period_images
  WHERE itinerary_id = v_itin.id;

  RETURN json_build_object(
    'itinerary', json_build_object(
      'id', v_itin.id,
      'destination', v_itin.destination,
      'start_date', v_itin.start_date,
      'end_date', v_itin.end_date,
      'cover_image_url', v_itin.cover_image_url,
      'destination_intro_text', v_itin.destination_intro_text,
      'destination_intro_images', v_itin.destination_intro_images,
      'show_destination_intro', v_itin.show_destination_intro,
      'days', v_days,
      'period_images', v_period_images
    )
  );
END;
$function$;
