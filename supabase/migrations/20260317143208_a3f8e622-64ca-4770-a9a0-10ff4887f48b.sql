
-- Add payment display configuration columns to quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_display_mode text NOT NULL DEFAULT 'full_payment',
  ADD COLUMN IF NOT EXISTS installments_count integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS entry_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method_label text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS full_payment_discount_percent numeric DEFAULT 0;
