
ALTER TABLE public.sale_products
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.tour_operators(id) ON DELETE SET NULL;

ALTER TABLE public.supplier_payments
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.tour_operators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sale_products_operator_idx
  ON public.sale_products (operator_id) WHERE operator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS supplier_payments_operator_idx
  ON public.supplier_payments (operator_id) WHERE operator_id IS NOT NULL;
