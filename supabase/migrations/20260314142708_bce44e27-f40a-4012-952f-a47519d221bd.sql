-- Allow admins full access to business_cards
CREATE POLICY "Admins full access to business cards"
ON public.business_cards
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to SELECT all cards (including inactive)
CREATE POLICY "Admins can view all business cards"
ON public.business_cards
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));