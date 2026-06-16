-- 1. Add column linking V2 itinerary activities to wallet services
ALTER TABLE public.itinerary_activities
  ADD COLUMN linked_trip_service_id uuid REFERENCES public.trip_services(id) ON DELETE SET NULL;

CREATE INDEX idx_itinerary_activities_linked_trip_service_id
  ON public.itinerary_activities(linked_trip_service_id);

-- 2. Update public RPC to expose the new column so the public wallet can render the chip
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
      d.id, d.day_number, d.date,
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