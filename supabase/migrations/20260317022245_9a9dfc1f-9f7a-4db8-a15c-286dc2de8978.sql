CREATE POLICY "Public can view profiles of active showcases"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agency_showcases
    WHERE agency_showcases.user_id = profiles.user_id
      AND agency_showcases.is_active = true
  )
);