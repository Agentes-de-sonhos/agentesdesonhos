-- Add logo_url column to trade_suppliers table
ALTER TABLE public.trade_suppliers
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create specialties table for global specialty definitions
CREATE TABLE IF NOT EXISTS public.specialties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on specialties
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- Specialties are readable by everyone (authenticated users)
CREATE POLICY "Authenticated users can read specialties"
ON public.specialties
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete specialties
CREATE POLICY "Admins can manage specialties"
ON public.specialties
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create junction table for supplier specialties (many-to-many)
CREATE TABLE IF NOT EXISTS public.supplier_specialties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.trade_suppliers(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, specialty_id)
);

-- Enable RLS on supplier_specialties
ALTER TABLE public.supplier_specialties ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read supplier specialties
CREATE POLICY "Authenticated users can read supplier_specialties"
ON public.supplier_specialties
FOR SELECT
TO authenticated
USING (true);

-- Admins can manage supplier specialties
CREATE POLICY "Admins can manage supplier_specialties"
ON public.supplier_specialties
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for supplier logos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-logos', 'supplier-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload supplier logos
CREATE POLICY "Authenticated users can upload supplier logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'supplier-logos');

-- Allow authenticated users to update supplier logos
CREATE POLICY "Authenticated users can update supplier logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'supplier-logos');

-- Allow public read access to supplier logos
CREATE POLICY "Public can read supplier logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'supplier-logos');

-- Allow authenticated users to delete supplier logos
CREATE POLICY "Authenticated users can delete supplier logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-logos');