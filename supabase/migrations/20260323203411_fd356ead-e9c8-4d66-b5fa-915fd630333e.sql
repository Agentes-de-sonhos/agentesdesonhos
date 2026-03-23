CREATE POLICY "Public can view profile of quote owner"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  user_id IN (
    SELECT q.user_id FROM quotes q
    WHERE q.status = 'published' AND q.share_token IS NOT NULL
  )
);