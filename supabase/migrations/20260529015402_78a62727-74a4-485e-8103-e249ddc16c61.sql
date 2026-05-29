GRANT SELECT, UPDATE, DELETE ON public.lead_captures TO authenticated;
GRANT INSERT ON public.lead_captures TO anon, authenticated;
GRANT ALL ON public.lead_captures TO service_role;

GRANT SELECT, UPDATE, DELETE ON public.sales_landing_leads TO authenticated;
GRANT ALL ON public.sales_landing_leads TO service_role;

CREATE POLICY "Owner updates own leads"
  ON public.sales_landing_leads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);