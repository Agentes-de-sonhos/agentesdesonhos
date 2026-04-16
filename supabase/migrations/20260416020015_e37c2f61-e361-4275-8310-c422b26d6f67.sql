ALTER TABLE public.tour_operators 
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS competitive_advantages text,
ADD COLUMN IF NOT EXISTS business_hours jsonb,
ADD COLUMN IF NOT EXISTS certifications text;