-- Make user_id nullable for "avulso" cards
ALTER TABLE public.business_cards ALTER COLUMN user_id DROP NOT NULL;

-- Allow anonymous inserts
CREATE POLICY "Anyone can create a business card"
ON public.business_cards
FOR INSERT
TO anon, authenticated
WITH CHECK (true);