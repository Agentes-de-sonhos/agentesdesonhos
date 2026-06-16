
-- =====================================================================
-- Fase 3: RPC de clone transacional
-- =====================================================================
CREATE OR REPLACE FUNCTION public.clone_itinerary_for_trip(
  p_source_itinerary_id uuid,
  p_trip_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Carrega e valida o roteiro de origem
  SELECT * INTO v_source FROM public.itineraries WHERE id = p_source_itinerary_id;
  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'Roteiro de origem não encontrado';
  END IF;
  IF v_source.user_id <> v_caller THEN
    RAISE EXCEPTION 'Sem permissão sobre o roteiro de origem';
  END IF;

  -- Carrega e valida a carteira
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id;
  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;
  IF v_trip.user_id <> v_caller THEN
    RAISE EXCEPTION 'Sem permissão sobre a carteira';
  END IF;

  -- Cria o novo itinerário (cópia) com campos públicos resetados
  INSERT INTO public.itineraries (
    user_id, destination, start_date, end_date, travelers_count,
    trip_type, budget_level, status, share_token, share_expires_at,
    client_id, public_access_code, cover_image_url,
    destination_intro_text, destination_intro_images, show_destination_intro,
    passengers, source_itinerary_id
  ) VALUES (
    v_caller, v_source.destination, v_source.start_date, v_source.end_date,
    v_source.travelers_count, v_source.trip_type, v_source.budget_level,
    'draft',           -- reset
    NULL,              -- reset share_token
    NULL,              -- reset share_expires_at
    v_trip.client_id,  -- vincula ao cliente da carteira (ou herda)
    NULL,              -- reset public_access_code
    v_source.cover_image_url,
    v_source.destination_intro_text, v_source.destination_intro_images,
    v_source.show_destination_intro, v_source.passengers,
    v_source.id
  )
  RETURNING id INTO v_new_id;

  -- Copia dias + atividades, remapeando day_id
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

  -- Copia imagens por período
  INSERT INTO public.itinerary_period_images (itinerary_id, day_date, period, image_url)
  SELECT v_new_id, day_date, period, image_url
  FROM public.itinerary_period_images
  WHERE itinerary_id = p_source_itinerary_id;

  -- Vincula à carteira e marca modo v2
  UPDATE public.trips
  SET itinerary_id = v_new_id,
      itinerary_mode = 'v2',
      updated_at = now()
  WHERE id = p_trip_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_itinerary_for_trip(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_itinerary_for_trip(uuid, uuid) TO authenticated;


-- =====================================================================
-- Fase 5: RPC de leitura pública do roteiro V2 da carteira
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_public_trip_itinerary_v2(
  p_trip_id uuid,
  p_access_code text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Dias + atividades aninhadas
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
            'document_urls', a.document_urls
          ) ORDER BY a.order_index
        )
        FROM public.itinerary_activities a
        WHERE a.day_id = d.id
      ), '[]'::json) AS activities
    FROM public.itinerary_days d
    WHERE d.itinerary_id = v_itin.id
    ORDER BY d.day_number
  ) d;

  -- Imagens por período
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
$$;

REVOKE ALL ON FUNCTION public.get_public_trip_itinerary_v2(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_trip_itinerary_v2(uuid, text) TO anon, authenticated;
