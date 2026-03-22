
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'past',
  ADD COLUMN IF NOT EXISTS trip_status text DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS include_in_billing boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS origin text DEFAULT 'funnel';
