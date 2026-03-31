-- Allow all authenticated users to read basic profile info (name, avatar, agency)
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);
