-- Create materials table for promotional materials
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.trade_suppliers(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  material_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  video_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flight blocks table
CREATE TABLE public.flight_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator TEXT NOT NULL,
  airline TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for materials
CREATE POLICY "Authenticated users can view active materials"
  ON public.materials
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage materials"
  ON public.materials
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for flight_blocks
CREATE POLICY "Authenticated users can view active flight blocks"
  ON public.flight_blocks
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage flight blocks"
  ON public.flight_blocks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_materials_supplier ON public.materials(supplier_id);
CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_materials_type ON public.materials(material_type);
CREATE INDEX idx_materials_active ON public.materials(is_active);
CREATE INDEX idx_flight_blocks_destination ON public.flight_blocks(destination);
CREATE INDEX idx_flight_blocks_operator ON public.flight_blocks(operator);
CREATE INDEX idx_flight_blocks_dates ON public.flight_blocks(start_date, end_date);
CREATE INDEX idx_flight_blocks_active ON public.flight_blocks(is_active);

-- Triggers for updated_at
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flight_blocks_updated_at
  BEFORE UPDATE ON public.flight_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for materials
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true);

-- Storage policies for materials bucket
CREATE POLICY "Anyone can view materials files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'materials');

CREATE POLICY "Admins can upload materials files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update materials files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete materials files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'materials' AND has_role(auth.uid(), 'admin'::app_role));