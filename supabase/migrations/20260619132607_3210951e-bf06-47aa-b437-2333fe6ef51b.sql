ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS investment_summary_layout text
  DEFAULT 'legacy';

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_investment_summary_layout_check;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_investment_summary_layout_check
  CHECK (investment_summary_layout IN ('legacy','grouped','ungrouped'));