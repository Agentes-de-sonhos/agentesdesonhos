
-- Add sale_product_id to income_entries for product-level tracking
ALTER TABLE public.income_entries
ADD COLUMN IF NOT EXISTS sale_product_id UUID REFERENCES public.sale_products(id) ON DELETE CASCADE;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_income_entries_sale_product_id ON public.income_entries(sale_product_id);
