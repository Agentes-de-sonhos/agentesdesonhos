DROP POLICY IF EXISTS "Users can update own poll vote" ON public.community_post_poll_votes;
CREATE POLICY "Users can update own poll vote"
ON public.community_post_poll_votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);