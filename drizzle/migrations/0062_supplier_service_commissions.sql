-- Catálogo de serviços personalizados por agência
CREATE TABLE public.agency_service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  base_category text NOT NULL CHECK (base_category IN ('aereo','hotel','seguro','cruzeiro','transfer','atracao','locacao','pacote','outro')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_service_types_name_len CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  CONSTRAINT agency_service_types_unique UNIQUE (agency_id, normalized_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_service_types TO authenticated;
GRANT ALL ON public.agency_service_types TO service_role;
ALTER TABLE public.agency_service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage service types" ON public.agency_service_types
  FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id))
  WITH CHECK (public.is_agency_member(agency_id));

-- Regras de comissão por fornecedor + serviço
CREATE TABLE public.agency_supplier_service_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  operator_id uuid NOT NULL REFERENCES public.tour_operators(id) ON DELETE CASCADE,
  service_key text NOT NULL CHECK (service_key ~ '^(sys:[a-z_]+|custom:[0-9a-f-]{36})$'),
  commission_type text NOT NULL CHECK (commission_type IN ('percentage','fixed','none')),
  commission_value numeric CHECK (commission_value IS NULL OR commission_value >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_ssc_percent_range CHECK (commission_type <> 'percentage' OR (commission_value IS NOT NULL AND commission_value <= 100)),
  CONSTRAINT agency_ssc_none_no_value CHECK (commission_type <> 'none' OR commission_value IS NULL),
  CONSTRAINT agency_ssc_unique UNIQUE (agency_id, operator_id, service_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_supplier_service_commissions TO authenticated;
GRANT ALL ON public.agency_supplier_service_commissions TO service_role;
ALTER TABLE public.agency_supplier_service_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage supplier service commissions" ON public.agency_supplier_service_commissions
  FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id))
  WITH CHECK (public.is_agency_member(agency_id));
CREATE INDEX agency_ssc_agency_operator_idx ON public.agency_supplier_service_commissions (agency_id, operator_id);

-- Força agency_id para a agência do usuário (colaboradores gravam na agência)
CREATE OR REPLACE FUNCTION public.force_agency_id_to_current_agency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_agency uuid;
BEGIN
  v_agency := public.current_agency_id();
  IF v_agency IS NOT NULL THEN NEW.agency_id := v_agency; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_force_agency_service_types BEFORE INSERT ON public.agency_service_types
  FOR EACH ROW EXECUTE FUNCTION public.force_agency_id_to_current_agency();
CREATE TRIGGER trg_force_agency_ssc BEFORE INSERT ON public.agency_supplier_service_commissions
  FOR EACH ROW EXECUTE FUNCTION public.force_agency_id_to_current_agency();
CREATE TRIGGER update_agency_service_types_updated_at BEFORE UPDATE ON public.agency_service_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_ssc_updated_at BEFORE UPDATE ON public.agency_supplier_service_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Snapshot da regra usada em cada produto de venda (aditivo, nulo para histórico)
ALTER TABLE public.sale_products
  ADD COLUMN IF NOT EXISTS service_key text,
  ADD COLUMN IF NOT EXISTS service_label text,
  ADD COLUMN IF NOT EXISTS commission_kind text CHECK (commission_kind IS NULL OR commission_kind IN ('percentage','fixed','none')),
  ADD COLUMN IF NOT EXISTS commission_rule_source text CHECK (commission_rule_source IS NULL OR commission_rule_source IN ('specific','legacy_fallback','manual')),
  ADD COLUMN IF NOT EXISTS commission_amount_snapshot numeric;

COMMENT ON COLUMN public.agency_supplier_terms.default_non_commissionable_fees IS 'DEPRECATED: taxas não comissionáveis agora são informadas por venda; valor mantido apenas como histórico';
COMMENT ON COLUMN public.agency_supplier_terms.default_commission_type IS 'Comissão geral antiga: usada apenas como fallback provisório identificado quando não há regra por serviço';