-- Fix registration_links: remove permissive anon policy
DROP POLICY IF EXISTS "Anyone can read links by token" ON public.registration_links;

-- Fix user_training_progress: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view progress for ranking" ON public.user_training_progress;
CREATE POLICY "Authenticated view progress for ranking"
  ON public.user_training_progress FOR SELECT TO authenticated
  USING (true);

-- Fix user_certificates: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view certificates for ranking" ON public.user_certificates;
CREATE POLICY "Authenticated view certificates for ranking"
  ON public.user_certificates FOR SELECT TO authenticated
  USING (true);

-- Fix business_card_stats: remove permissive read
DROP POLICY IF EXISTS "Anyone can read card stats" ON public.business_card_stats;