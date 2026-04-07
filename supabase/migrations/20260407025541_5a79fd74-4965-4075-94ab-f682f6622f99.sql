
ALTER TABLE public.sale_products
  ADD COLUMN IF NOT EXISTS non_commissionable_taxes numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS payment_rule text DEFAULT 'after_sale',
  ADD COLUMN IF NOT EXISTS payment_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS expected_date date,
  ADD COLUMN IF NOT EXISTS requires_invoice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'a_emitir',
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_issued_date date,
  ADD COLUMN IF NOT EXISTS invoice_sent_date date;
