
-- Create storage bucket for academy files
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-files', 'academy-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to academy-files
CREATE POLICY "Authenticated users can upload academy files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'academy-files');

-- Allow public read access
CREATE POLICY "Public read access for academy files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'academy-files');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete academy files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'academy-files');
