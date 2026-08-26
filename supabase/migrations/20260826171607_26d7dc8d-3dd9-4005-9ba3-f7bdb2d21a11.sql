DROP POLICY IF EXISTS "Public can view published itineraries with valid token" ON public.itineraries;
DROP POLICY IF EXISTS "Public can view days of published itineraries with valid token" ON public.itinerary_days;
DROP POLICY IF EXISTS "Public can view activities of published itineraries with valid token" ON public.itinerary_activities;
DROP POLICY IF EXISTS "Public can view period images of published itineraries with valid token" ON public.itinerary_period_images;

CREATE OR REPLACE FUNCTION public.get_public_itinerary_by_share_token(p_share_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.get_public_itinerary_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_itinerary_by_share_token(text) TO anon, authenticated, service_role;