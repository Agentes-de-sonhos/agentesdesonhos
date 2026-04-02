CREATE POLICY "Public can view basic profile data"
ON public.profiles
FOR SELECT
TO anon
USING (true);