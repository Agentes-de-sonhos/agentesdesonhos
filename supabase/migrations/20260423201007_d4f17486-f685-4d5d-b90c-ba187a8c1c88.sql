-- 1) Add is_public column to quote_documents
ALTER TABLE public.quote_documents
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_quote_documents_quote_public
  ON public.quote_documents(quote_id) WHERE is_public = true;

-- 2) Public SELECT policy on quote_documents: allow anonymous read of rows
--    that are flagged is_public AND belong to a published quote.
DROP POLICY IF EXISTS "Public can view shared documents of published quotes"
  ON public.quote_documents;

CREATE POLICY "Public can view shared documents of published quotes"
ON public.quote_documents
FOR SELECT
TO anon, authenticated
USING (
  is_public = true
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_documents.quote_id
      AND q.status = 'published'
  )
);

-- 3) Storage policy: allow anonymous SELECT on objects in 'quote-documents'
--    bucket whose path is referenced by a quote_documents row marked public.
DROP POLICY IF EXISTS "Public can read shared quote documents"
  ON storage.objects;

CREATE POLICY "Public can read shared quote documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'quote-documents'
  AND EXISTS (
    SELECT 1
    FROM public.quote_documents qd
    JOIN public.quotes q ON q.id = qd.quote_id
    WHERE qd.file_path = storage.objects.name
      AND qd.is_public = true
      AND q.status = 'published'
  )
);