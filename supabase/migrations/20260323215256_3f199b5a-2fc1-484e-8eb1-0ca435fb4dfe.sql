
-- Add service payment control to quotes (non-destructive, nullable, defaults to false)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS use_service_payment boolean NOT NULL DEFAULT false;

-- Add per-service payment fields to quote_services (all nullable, no impact on existing rows)
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS is_custom_payment boolean NOT NULL DEFAULT false;
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS payment_type text;
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS installments integer;
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS entry_value numeric;
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS discount_type text;
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS discount_value numeric;
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS payment_method text;
