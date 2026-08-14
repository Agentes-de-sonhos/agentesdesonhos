ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'itemized',
  ADD COLUMN IF NOT EXISTS package_total_amount numeric NULL;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_pricing_mode_check;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_pricing_mode_check CHECK (pricing_mode IN ('itemized','package'));

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_package_total_amount_check;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_package_total_amount_check CHECK (package_total_amount IS NULL OR package_total_amount >= 0);