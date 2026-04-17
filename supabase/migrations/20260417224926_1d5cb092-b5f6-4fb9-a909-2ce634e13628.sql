
-- Permitir upload anônimo na pasta temp/ do bucket tour-guides-gallery (cadastro público de guias)
CREATE POLICY "Anon upload temp tour guide files"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'tour-guides-gallery'
  AND (storage.foldername(name))[1] = 'temp'
);

-- Permitir leitura pública já existe (Public read tour guides gallery)
-- Permitir delete temporário para limpeza pelo próprio uploader durante o cadastro
CREATE POLICY "Anon delete temp tour guide files"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'tour-guides-gallery'
  AND (storage.foldername(name))[1] = 'temp'
);
