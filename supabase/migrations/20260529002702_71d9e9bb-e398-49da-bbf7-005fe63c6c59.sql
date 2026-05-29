-- Tighten storage policies on bucket `quote-images`:
-- Require new INSERT/UPDATE/DELETE to be scoped to the authenticated user's folder
-- (path must start with `${auth.uid()}/...`). Keeps public SELECT for backward
-- compatibility with legacy files at the bucket root or under `trip-services/`.

DROP POLICY IF EXISTS "Users can upload quote images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete quote images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update quote images" ON storage.objects;

CREATE POLICY "Users can upload their own quote images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own quote images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quote-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'quote-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own quote images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
