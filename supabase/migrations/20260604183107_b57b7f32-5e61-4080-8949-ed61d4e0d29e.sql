
-- ============================================================
-- FASE 1 — FUNDAÇÃO DOS FORNECEDORES
-- Aditiva e retrocompatível. Não altera dados existentes.
-- ============================================================

-- 1) Evoluir tour_operators -----------------------------------
ALTER TABLE public.tour_operators
  ADD COLUMN IF NOT EXISTS source           text,
  ADD COLUMN IF NOT EXISTS external_id      text,
  ADD COLUMN IF NOT EXISTS owner_agency_id  uuid;

-- Restringir valores válidos em source (NULL permitido p/ legado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tour_operators_source_check'
  ) THEN
    ALTER TABLE public.tour_operators
      ADD CONSTRAINT tour_operators_source_check
      CHECK (source IS NULL OR source IN ('manual', 'travelmeet', 'agency'));
  END IF;
END $$;

-- Índice único parcial: só aplica quando ambos preenchidos (evita conflito c/ legado)
CREATE UNIQUE INDEX IF NOT EXISTS tour_operators_source_external_uidx
  ON public.tour_operators (source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

-- Índice auxiliar p/ filtros de agência
CREATE INDEX IF NOT EXISTS tour_operators_owner_agency_idx
  ON public.tour_operators (owner_agency_id)
  WHERE owner_agency_id IS NOT NULL;

-- 2) RLS de tour_operators: ocultar pending/rejected do público
-- Mantém visíveis para o dono e para admins.
DROP POLICY IF EXISTS "Authenticated can view active operators" ON public.tour_operators;

CREATE POLICY "Authenticated can view operators"
  ON public.tour_operators
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
    OR (
      is_active = true
      AND COALESCE(approval_status, 'approved') = 'approved'
      AND (owner_agency_id IS NULL OR owner_agency_id = auth.uid())
    )
  );

-- 3) Criar tabela agency_supplier_terms -----------------------
CREATE TABLE IF NOT EXISTS public.agency_supplier_terms (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                       uuid NOT NULL,
  operator_id                     uuid NOT NULL REFERENCES public.tour_operators(id) ON DELETE CASCADE,
  default_commission_type         text CHECK (default_commission_type IN ('percentage','fixed')),
  default_commission_percent      numeric,
  default_commission_fixed        numeric,
  default_non_commissionable_fees numeric,
  payment_rule                    text,
  payment_days                    integer,
  requires_invoice                boolean DEFAULT false,
  preferred_contact_id            uuid,
  notes                           text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_supplier_terms_unique UNIQUE (agency_id, operator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_supplier_terms TO authenticated;
GRANT ALL ON public.agency_supplier_terms TO service_role;

ALTER TABLE public.agency_supplier_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency manages own supplier terms"
  ON public.agency_supplier_terms
  FOR ALL
  TO authenticated
  USING (agency_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (agency_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at (reutiliza função já existente no projeto)
DROP TRIGGER IF EXISTS update_agency_supplier_terms_updated_at ON public.agency_supplier_terms;
CREATE TRIGGER update_agency_supplier_terms_updated_at
  BEFORE UPDATE ON public.agency_supplier_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS agency_supplier_terms_agency_idx
  ON public.agency_supplier_terms (agency_id);
CREATE INDEX IF NOT EXISTS agency_supplier_terms_operator_idx
  ON public.agency_supplier_terms (operator_id);
