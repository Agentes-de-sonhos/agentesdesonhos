-- Colaboradores da equipe da agência passam a ler as solicitações do site da própria agência.
ALTER POLICY "Agency owner reads own site requests"
  ON public.agency_site_requests
  USING (
    agency_user_id = auth.uid()
    OR agency_user_id = public.user_agency_id(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
