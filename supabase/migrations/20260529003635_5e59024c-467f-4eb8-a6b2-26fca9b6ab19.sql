-- Restrict ticket-attachments bucket: any authenticated user could insert anywhere.
-- Now require user_id as the first path segment for INSERT/UPDATE/DELETE.
-- SELECT remains permissive to preserve existing links for in-flight tickets.

DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;

CREATE POLICY "Users upload ticket attachments to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own ticket attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own ticket attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);