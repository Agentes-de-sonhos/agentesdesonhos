
ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS currency_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT NULL;
