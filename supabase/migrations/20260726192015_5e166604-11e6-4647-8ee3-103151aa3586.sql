ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS edited_at timestamptz;
UPDATE public.community_posts SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);