CREATE POLICY "Public can view profile of published itinerary owner"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  user_id IN (
    SELECT user_id FROM public.itineraries WHERE status = 'published' AND share_token IS NOT NULL
  )
);