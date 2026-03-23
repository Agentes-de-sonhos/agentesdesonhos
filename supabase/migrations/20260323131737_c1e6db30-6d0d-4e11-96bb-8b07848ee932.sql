
ALTER TABLE public.quote_services ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

UPDATE public.quote_services SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND (image_urls IS NULL OR image_urls = '{}');
