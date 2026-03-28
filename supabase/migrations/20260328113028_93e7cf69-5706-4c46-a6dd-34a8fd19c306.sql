-- Make vouchers bucket private
UPDATE storage.buckets SET public = false WHERE id = 'vouchers';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view vouchers" ON storage.objects;

-- Create a restricted SELECT policy: only authenticated users can view their own files
CREATE POLICY "Users can view their own vouchers"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'vouchers' AND auth.uid()::text = (storage.foldername(name))[1]);