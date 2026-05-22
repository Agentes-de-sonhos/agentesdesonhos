
-- Bucket privado para armazenar documentos enviados na importação inteligente
-- dos serviços (transfer, ingressos, seguro, cruzeiro, circuito, outros).
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-imports', 'service-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Usuário autenticado só acessa arquivos dentro da sua própria pasta (prefixo = user_id).
CREATE POLICY "Users upload own service imports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-imports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own service imports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'service-imports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own service imports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-imports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
