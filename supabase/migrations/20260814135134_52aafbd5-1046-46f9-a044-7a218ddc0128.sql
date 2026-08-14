ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_package_total_required_check
  CHECK (pricing_mode <> 'package' OR (package_total_amount IS NOT NULL AND package_total_amount > 0));