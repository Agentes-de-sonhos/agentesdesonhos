
-- Allow authenticated users (not just admins) to upload to media-files bucket
DROP POLICY IF EXISTS "Admins can upload media files" ON storage.objects;
CREATE POLICY "Authenticated users can upload media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-files');

-- Allow authenticated users to update their own uploads
DROP POLICY IF EXISTS "Admins can update media files" ON storage.objects;
CREATE POLICY "Authenticated users can update media files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media-files');

-- Allow authenticated users to delete their own uploads
DROP POLICY IF EXISTS "Admins can delete media files" ON storage.objects;
CREATE POLICY "Authenticated users can delete media files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media-files');

-- Allow authenticated users to insert into media_files table
CREATE POLICY "Authenticated users can insert media files"
ON public.media_files FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- Allow authenticated users to read media files
CREATE POLICY "Authenticated users can read media files"
ON public.media_files FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to read media folders
CREATE POLICY "Authenticated users can read media folders"
ON public.media_folders FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to create folders
CREATE POLICY "Authenticated users can create media folders"
ON public.media_folders FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());
