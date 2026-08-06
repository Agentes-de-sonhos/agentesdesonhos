CREATE POLICY "Admins read material imports storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'materials-imports' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins write material imports storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials-imports' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update material imports storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'materials-imports' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'materials-imports' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete material imports storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materials-imports' AND has_role(auth.uid(), 'admin'::app_role));