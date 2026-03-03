-- Add canva_url to materials for Canva template links
ALTER TABLE public.materials ADD COLUMN canva_url text DEFAULT NULL;