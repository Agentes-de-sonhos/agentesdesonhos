CREATE POLICY "Users read own full-package files"
ON storage.objects FOR SELECT
USING (bucket_id = 'full-package-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own full-package files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'full-package-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own full-package files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'full-package-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own full-package files"
ON storage.objects FOR DELETE
USING (bucket_id = 'full-package-imports' AND auth.uid()::text = (storage.foldername(name))[1]);