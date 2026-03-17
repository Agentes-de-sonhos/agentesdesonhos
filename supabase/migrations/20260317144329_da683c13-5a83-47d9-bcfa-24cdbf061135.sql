
-- Add image_url column to quote_services
ALTER TABLE public.quote_services
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Create storage bucket for quote service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-images', 'quote-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload quote images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quote-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Users can delete quote images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'quote-images');

-- Public read for quote images
CREATE POLICY "Public can view quote images"
ON storage.objects FOR SELECT
USING (bucket_id = 'quote-images');
