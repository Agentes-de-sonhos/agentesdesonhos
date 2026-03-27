
ALTER TABLE public.income_entries 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS expected_date text;

COMMENT ON COLUMN public.income_entries.status IS 'pending, received, overdue';
COMMENT ON COLUMN public.income_entries.source IS 'manual, sale, commission';
