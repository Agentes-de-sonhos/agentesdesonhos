ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS source_quote_id uuid,
  ADD COLUMN IF NOT EXISTS source_trip_id uuid,
  ADD COLUMN IF NOT EXISTS source_operation_id uuid,
  ADD COLUMN IF NOT EXISTS import_provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS import_fingerprint text;

CREATE INDEX IF NOT EXISTS idx_sales_source_quote ON public.sales(source_quote_id) WHERE source_quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_source_trip ON public.sales(source_trip_id) WHERE source_trip_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_import_fingerprint ON public.sales(user_id, import_fingerprint) WHERE import_fingerprint IS NOT NULL;

ALTER TABLE public.sale_products
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS source_service_id uuid,
  ADD COLUMN IF NOT EXISTS source_provenance jsonb NOT NULL DEFAULT '{}'::jsonb;