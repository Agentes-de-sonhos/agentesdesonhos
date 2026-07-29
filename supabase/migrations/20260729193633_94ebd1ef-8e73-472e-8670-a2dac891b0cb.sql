-- 1. Templates
CREATE TABLE public.agency_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  legal_body_html text NOT NULL DEFAULT '',
  header_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  footer_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  agency_data_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  contract_title text NOT NULL DEFAULT 'Contrato de Prestação de Serviços Turísticos',
  effective_from date,
  effective_until date,
  created_by_admin uuid,
  updated_by_admin uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_contract_templates_status_check CHECK (status IN ('draft','active','inactive','archived')),
  CONSTRAINT agency_contract_templates_agency_version_unique UNIQUE (agency_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_contract_templates TO authenticated;
GRANT ALL ON public.agency_contract_templates TO service_role;
ALTER TABLE public.agency_contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contract templates" ON public.agency_contract_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agency members read own active template" ON public.agency_contract_templates
  FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id));
CREATE INDEX idx_agency_contract_templates_agency ON public.agency_contract_templates(agency_id, status);

-- 2. Sections
CREATE TABLE public.agency_contract_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.agency_contract_templates(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title text,
  body_html text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_fixed boolean NOT NULL DEFAULT true,
  conditional_rule jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_contract_template_sections TO authenticated;
GRANT ALL ON public.agency_contract_template_sections TO service_role;
ALTER TABLE public.agency_contract_template_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage template sections" ON public.agency_contract_template_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agency members read own template sections" ON public.agency_contract_template_sections
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_contract_templates t
    WHERE t.id = template_id AND public.is_agency_member(t.agency_id)
  ));
CREATE INDEX idx_contract_template_sections_template ON public.agency_contract_template_sections(template_id, display_order);

-- 3. Sale contracts
CREATE TABLE public.sale_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.agency_contract_templates(id) ON DELETE SET NULL,
  template_version integer,
  contract_number text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'generated',
  generated_payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_html text,
  pdf_url text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  client_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  passengers_snapshot_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  services_snapshot_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  financial_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  agency_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_hash text,
  document_hash text,
  supersedes_contract_id uuid REFERENCES public.sale_contracts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sale_contracts_status_check CHECK (status IN ('draft','generated','sent','signed','cancelled','superseded'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_contracts TO authenticated;
GRANT ALL ON public.sale_contracts TO service_role;
ALTER TABLE public.sale_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage own sale contracts" ON public.sale_contracts
  FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id))
  WITH CHECK (public.is_agency_member(agency_id));
CREATE POLICY "Admins read sale contracts" ON public.sale_contracts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_sale_contracts_sale ON public.sale_contracts(sale_id, revision DESC);
CREATE INDEX idx_sale_contracts_agency ON public.sale_contracts(agency_id);

-- 4. Acceptances
CREATE TABLE public.sale_contract_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.sale_contracts(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_document text,
  signer_email text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  authentication_code text,
  acceptance_type text NOT NULL DEFAULT 'click',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sale_contract_acceptances TO authenticated;
GRANT ALL ON public.sale_contract_acceptances TO service_role;
ALTER TABLE public.sale_contract_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members read own acceptances" ON public.sale_contract_acceptances
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sale_contracts c
    WHERE c.id = contract_id AND public.is_agency_member(c.agency_id)
  ));
CREATE POLICY "Agency members insert own acceptances" ON public.sale_contract_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sale_contracts c
    WHERE c.id = contract_id AND public.is_agency_member(c.agency_id)
  ));

-- 5. Audit log
CREATE TABLE public.sale_contract_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.sale_contracts(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  sale_id uuid,
  action text NOT NULL,
  actor_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sale_contract_audit_logs TO authenticated;
GRANT ALL ON public.sale_contract_audit_logs TO service_role;
ALTER TABLE public.sale_contract_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members read own contract logs" ON public.sale_contract_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id));
CREATE POLICY "Agency members insert own contract logs" ON public.sale_contract_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(agency_id));
CREATE POLICY "Admins read all contract logs" ON public.sale_contract_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_sale_contract_audit_contract ON public.sale_contract_audit_logs(contract_id, created_at DESC);

-- 6. updated_at triggers
CREATE TRIGGER update_agency_contract_templates_updated_at BEFORE UPDATE ON public.agency_contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_contract_template_sections_updated_at BEFORE UPDATE ON public.agency_contract_template_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sale_contracts_updated_at BEFORE UPDATE ON public.sale_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Only one active template per agency
CREATE UNIQUE INDEX uq_agency_contract_templates_one_active
  ON public.agency_contract_templates(agency_id) WHERE status = 'active';

-- 8. Immutability: generated contracts cannot be rewritten (only status/pdf_url may change)
CREATE OR REPLACE FUNCTION public.protect_generated_sale_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    IF NEW.generated_html IS DISTINCT FROM OLD.generated_html
       OR NEW.generated_payload_json IS DISTINCT FROM OLD.generated_payload_json
       OR NEW.client_snapshot_json IS DISTINCT FROM OLD.client_snapshot_json
       OR NEW.passengers_snapshot_json IS DISTINCT FROM OLD.passengers_snapshot_json
       OR NEW.services_snapshot_json IS DISTINCT FROM OLD.services_snapshot_json
       OR NEW.financial_snapshot_json IS DISTINCT FROM OLD.financial_snapshot_json
       OR NEW.agency_snapshot_json IS DISTINCT FROM OLD.agency_snapshot_json
       OR NEW.document_hash IS DISTINCT FROM OLD.document_hash
       OR NEW.contract_number IS DISTINCT FROM OLD.contract_number THEN
      RAISE EXCEPTION 'Contrato já gerado não pode ser alterado. Gere uma nova versão.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_generated_sale_contract BEFORE UPDATE ON public.sale_contracts
  FOR EACH ROW EXECUTE FUNCTION public.protect_generated_sale_contract();