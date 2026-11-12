-- Team members need the active public hostname of their own agency when sharing.
-- Membership is maintained by the existing active-team membership trigger.
-- This adds SELECT only; owner/admin policies and all write permissions remain intact.
CREATE POLICY "Team can view active own agency domains"
ON public.agency_public_domains FOR SELECT TO authenticated
USING (
  is_active
  AND user_id = public.current_agency_id()
);
