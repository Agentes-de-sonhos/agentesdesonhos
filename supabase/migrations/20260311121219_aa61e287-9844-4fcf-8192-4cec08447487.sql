
-- The previous migration partially applied. Just add the missing stats policy with a different name.
-- Actually the policy already exists so we skip it. Just ensure anon can also SELECT stats.
CREATE POLICY "Anyone can read card stats"
ON public.business_card_stats
FOR SELECT
TO anon, authenticated
USING (true);
