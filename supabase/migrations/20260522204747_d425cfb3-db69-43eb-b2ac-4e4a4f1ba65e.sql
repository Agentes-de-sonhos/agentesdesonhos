INSERT INTO storage.buckets (id, name, public) VALUES ('car-rental-imports', 'car-rental-imports', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own car-rental imports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'car-rental-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own car-rental imports"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-rental-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own car-rental imports"
ON storage.objects FOR DELETE
USING (bucket_id = 'car-rental-imports' AND auth.uid()::text = (storage.foldername(name))[1]);