-- Create table for product-level breakdown per sale
CREATE TABLE public.sale_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  product_type TEXT NOT NULL, -- 'aereo', 'hotel', 'seguro', 'cruzeiro', 'transfer', 'atracao', 'locacao', 'outro'
  description TEXT,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  commission_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for supplier payments (outgoing cash flow)
CREATE TABLE public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  sale_product_id UUID REFERENCES public.sale_products(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for incoming payments (customer payments)
CREATE TABLE public.customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for sale_products
CREATE POLICY "Users can view their own sale products"
  ON public.sale_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sale products"
  ON public.sale_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sale products"
  ON public.sale_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sale products"
  ON public.sale_products FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for supplier_payments
CREATE POLICY "Users can view their own supplier payments"
  ON public.supplier_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplier payments"
  ON public.supplier_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplier payments"
  ON public.supplier_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplier payments"
  ON public.supplier_payments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for customer_payments
CREATE POLICY "Users can view their own customer payments"
  ON public.customer_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own customer payments"
  ON public.customer_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer payments"
  ON public.customer_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer payments"
  ON public.customer_payments FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_sale_products_sale_id ON public.sale_products(sale_id);
CREATE INDEX idx_sale_products_user_id ON public.sale_products(user_id);
CREATE INDEX idx_supplier_payments_user_id ON public.supplier_payments(user_id);
CREATE INDEX idx_supplier_payments_payment_date ON public.supplier_payments(payment_date);
CREATE INDEX idx_customer_payments_user_id ON public.customer_payments(user_id);
CREATE INDEX idx_customer_payments_payment_date ON public.customer_payments(payment_date);

-- Add triggers for updated_at
CREATE TRIGGER update_sale_products_updated_at
  BEFORE UPDATE ON public.sale_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_payments_updated_at
  BEFORE UPDATE ON public.supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_payments_updated_at
  BEFORE UPDATE ON public.customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();