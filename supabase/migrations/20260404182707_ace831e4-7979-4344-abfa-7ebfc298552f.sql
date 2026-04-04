
DROP POLICY IF EXISTS "Public can read itinerary for shared trips" ON public.trip_itinerary_activities;

CREATE POLICY "Public can read itinerary for shared trips"
ON public.trip_itinerary_activities
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_itinerary_activities.trip_id
      AND t.share_token IS NOT NULL
  )
);

CREATE OR REPLACE FUNCTION public.check_trip_shared(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id
      AND share_token IS NOT NULL
  )
$$;

DROP POLICY IF EXISTS "Public can read itinerary for shared trips" ON public.trip_itinerary_activities;

CREATE POLICY "Public can read itinerary for shared trips"
ON public.trip_itinerary_activities
FOR SELECT
TO anon, authenticated
USING (public.check_trip_shared(trip_id));
