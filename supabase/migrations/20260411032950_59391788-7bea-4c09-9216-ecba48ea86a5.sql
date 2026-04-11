
CREATE POLICY "Public can read overrides for active showcases"
ON public.showcase_auto_overrides FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.agency_showcases
    WHERE id = showcase_auto_overrides.showcase_id
    AND is_active = true
  )
);
