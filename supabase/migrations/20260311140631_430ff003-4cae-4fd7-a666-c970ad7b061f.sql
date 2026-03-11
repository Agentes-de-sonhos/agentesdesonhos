-- Allow anonymous uploads to avatars bucket for public card logos
CREATE POLICY "Allow anonymous uploads for public cards"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'public-cards');

-- Allow public read access on avatars bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on avatars' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read on avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = ''avatars'')';
  END IF;
END $$;