ALTER TABLE public.sale_contracts
  ADD COLUMN IF NOT EXISTS pdf_sha256 text,
  ADD COLUMN IF NOT EXISTS pdf_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS pdf_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_generator_version text,
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_mime_type text,
  ADD COLUMN IF NOT EXISTS pdf_file_name text;

-- Imutabilidade: metadados de um PDF já registrado não podem ser trocados silenciosamente.
CREATE OR REPLACE FUNCTION public.protect_sale_contract_pdf_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.pdf_sha256 IS NOT NULL AND NEW.pdf_sha256 IS DISTINCT FROM OLD.pdf_sha256 THEN
    RAISE EXCEPTION 'O PDF desta versão do contrato já foi registrado (%). Gere uma nova versão em vez de substituir.', OLD.pdf_sha256;
  END IF;
  IF OLD.pdf_storage_path IS NOT NULL AND NEW.pdf_storage_path IS DISTINCT FROM OLD.pdf_storage_path THEN
    RAISE EXCEPTION 'O arquivo desta versão do contrato já foi armazenado. Gere uma nova versão em vez de substituir.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sale_contract_pdf_metadata ON public.sale_contracts;
CREATE TRIGGER trg_protect_sale_contract_pdf_metadata
  BEFORE UPDATE ON public.sale_contracts
  FOR EACH ROW EXECUTE FUNCTION public.protect_sale_contract_pdf_metadata();

-- Storage: bucket privado sale-contracts, caminho {agency_id}/{sale_id}/{contract_id}.pdf
DROP POLICY IF EXISTS "Agency members read own contract pdfs" ON storage.objects;
CREATE POLICY "Agency members read own contract pdfs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sale-contracts'
  AND (
    public.is_agency_member(((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Agency members upload own contract pdfs" ON storage.objects;
CREATE POLICY "Agency members upload own contract pdfs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sale-contracts'
  AND public.is_agency_member(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Admins manage contract pdfs" ON storage.objects;
CREATE POLICY "Admins manage contract pdfs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'sale-contracts' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'sale-contracts' AND public.has_role(auth.uid(), 'admin'::app_role));