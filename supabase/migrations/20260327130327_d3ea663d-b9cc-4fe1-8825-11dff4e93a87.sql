
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS show_destination_intro boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS destination_intro_text text,
ADD COLUMN IF NOT EXISTS destination_intro_images text[] DEFAULT '{}';
