-- Add destination and thumbnail fields to materials table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS destination TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_materials_published_at ON public.materials(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON public.materials(supplier_id);