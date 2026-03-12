-- Add explicit deny-all policy to satisfy RLS policy checks
DROP POLICY IF EXISTS "No direct access to activation signup attempts" ON public.activation_signup_attempts;

CREATE POLICY "No direct access to activation signup attempts"
ON public.activation_signup_attempts
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);