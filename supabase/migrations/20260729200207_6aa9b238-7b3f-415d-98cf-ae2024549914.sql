GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_contract_templates TO authenticated;
GRANT ALL ON public.agency_contract_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_contract_template_sections TO authenticated;
GRANT ALL ON public.agency_contract_template_sections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_contracts TO authenticated;
GRANT ALL ON public.sale_contracts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_contract_acceptances TO authenticated;
GRANT ALL ON public.sale_contract_acceptances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_contract_audit_logs TO authenticated;
GRANT ALL ON public.sale_contract_audit_logs TO service_role;

CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read platform settings"
ON public.platform_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage platform settings"
ON public.platform_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (key, value)
VALUES ('support_whatsapp', '{"number":"5511982853937"}'::jsonb);