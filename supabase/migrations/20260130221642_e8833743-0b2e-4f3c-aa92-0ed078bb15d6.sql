-- Create trade_suppliers table
CREATE TABLE public.trade_suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    how_to_sell TEXT,
    sales_channel TEXT,
    practical_notes TEXT,
    website_url TEXT,
    instagram_url TEXT,
    other_social_media JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier_contacts table
CREATE TABLE public.supplier_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES public.trade_suppliers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for trade_suppliers
CREATE POLICY "Authenticated users can view active suppliers"
ON public.trade_suppliers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage trade suppliers"
ON public.trade_suppliers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for supplier_contacts
CREATE POLICY "Authenticated users can view contacts"
ON public.supplier_contacts
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.trade_suppliers 
        WHERE id = supplier_id AND is_active = true
    )
);

CREATE POLICY "Admins can manage supplier contacts"
ON public.supplier_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_trade_suppliers_updated_at
BEFORE UPDATE ON public.trade_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_contacts_updated_at
BEFORE UPDATE ON public.supplier_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_trade_suppliers_category ON public.trade_suppliers(category);
CREATE INDEX idx_trade_suppliers_is_active ON public.trade_suppliers(is_active);
CREATE INDEX idx_supplier_contacts_supplier_id ON public.supplier_contacts(supplier_id);