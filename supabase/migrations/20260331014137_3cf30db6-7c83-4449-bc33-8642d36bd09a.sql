-- Allow admins to delete any advisor review
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.advisor_reviews;
CREATE POLICY "Users can delete own or admin delete any reviews"
ON public.advisor_reviews FOR DELETE TO authenticated
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Allow users to update their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON public.advisor_reviews;
CREATE POLICY "Users can update own reviews"
ON public.advisor_reviews FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());