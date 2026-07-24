
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS show_pricing_section boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_content text;

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
    INSERT INTO public.itinerary_days (itinerary_id, day_number, date)
    VALUES (v_new_id, v_day.day_number, v_day.date)
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
