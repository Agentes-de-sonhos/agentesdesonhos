-- Remove the permissive anonymous INSERT policy
DROP POLICY IF EXISTS "Anyone can create a business card" ON public.business_cards;