ALTER TABLE public.sale_products
  ADD COLUMN IF NOT EXISTS commission_status text NOT NULL DEFAULT 'previsao_criada',
  ADD COLUMN IF NOT EXISTS received_date date,
  ADD COLUMN IF NOT EXISTS internal_notes text;