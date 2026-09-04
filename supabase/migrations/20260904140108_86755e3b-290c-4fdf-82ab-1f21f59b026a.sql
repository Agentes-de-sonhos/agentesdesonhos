CREATE POLICY "Agency can insert own private supplier"
ON public.tour_operators
FOR INSERT
TO authenticated
WITH CHECK (
  owner_agency_id IS NOT NULL
  AND is_agency_member(owner_agency_id)
  AND is_published = false
  AND is_public_visible = false
);

CREATE POLICY "Agency can update own private supplier"
ON public.tour_operators
FOR UPDATE
TO authenticated
USING (owner_agency_id IS NOT NULL AND is_agency_member(owner_agency_id) AND is_published = false)
WITH CHECK (owner_agency_id IS NOT NULL AND is_agency_member(owner_agency_id) AND is_published = false AND is_public_visible = false);