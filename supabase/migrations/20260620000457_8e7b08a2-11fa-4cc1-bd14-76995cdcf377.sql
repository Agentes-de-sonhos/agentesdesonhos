ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS hide_investment_total boolean DEFAULT false;

GRANT SELECT, INSERT, UPDATE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;