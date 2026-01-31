-- Create sales table (linked to opportunities or standalone)
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Policies for sales
CREATE POLICY "Users can view their own sales" 
ON public.sales FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales" 
ON public.sales FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales" 
ON public.sales FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales" 
ON public.sales FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create income_entries table (payments received)
CREATE TABLE public.income_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

-- Policies for income_entries
CREATE POLICY "Users can view their own income entries" 
ON public.income_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income entries" 
ON public.income_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income entries" 
ON public.income_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income entries" 
ON public.income_entries FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_income_entries_updated_at
BEFORE UPDATE ON public.income_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create expense_entries table (outflows)
CREATE TABLE public.expense_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  amount NUMERIC NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;

-- Policies for expense_entries
CREATE POLICY "Users can view their own expense entries" 
ON public.expense_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense entries" 
ON public.expense_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense entries" 
ON public.expense_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense entries" 
ON public.expense_entries FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_expense_entries_updated_at
BEFORE UPDATE ON public.expense_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sales_user_date ON public.sales(user_id, sale_date);
CREATE INDEX idx_income_entries_user_date ON public.income_entries(user_id, entry_date);
CREATE INDEX idx_expense_entries_user_date ON public.expense_entries(user_id, entry_date);