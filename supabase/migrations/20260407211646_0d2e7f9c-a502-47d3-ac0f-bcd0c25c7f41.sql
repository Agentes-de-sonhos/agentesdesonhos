
-- Table for sellers (vendedoras)
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  default_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sellers" ON public.sellers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sellers" ON public.sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sellers" ON public.sellers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sellers" ON public.sellers FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add seller fields to sales
ALTER TABLE public.sales ADD COLUMN seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN seller_commission_percent NUMERIC(5,2);

-- Add sale_id to expense_entries for automatic commission expenses
ALTER TABLE public.expense_entries ADD COLUMN sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE;
