CREATE OR REPLACE FUNCTION public.check_trip_shared(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id
      AND share_token IS NOT NULL
      AND length(share_token) >= 32
      AND (share_expires_at IS NULL OR share_expires_at > now())
  )
$function$;

DROP POLICY IF EXISTS "Public can view published itinerary period images"
  ON public.itinerary_period_images;

CREATE POLICY "Public can view period images of published itineraries with valid token"
  ON public.itinerary_period_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_period_images.itinerary_id
        AND i.status = 'published'
        AND i.share_token IS NOT NULL
        AND length(i.share_token) >= 32
        AND (i.share_expires_at IS NULL OR i.share_expires_at > now())
    )
  );