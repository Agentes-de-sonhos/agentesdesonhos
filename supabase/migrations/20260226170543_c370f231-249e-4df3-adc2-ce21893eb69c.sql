
INSERT INTO storage.buckets (id, name, public)
VALUES ('playbook-files', 'playbook-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read playbook files" ON storage.objects
  FOR SELECT USING (bucket_id = 'playbook-files');

CREATE POLICY "Admins can upload playbook files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'playbook-files'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete playbook files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'playbook-files'
    AND public.has_role(auth.uid(), 'admin')
  );
