CREATE OR REPLACE FUNCTION public.public_quote_document_file_allowed(p_file_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_documents qd
    JOIN public.quotes q ON q.id = qd.quote_id
    WHERE qd.file_path = p_file_path
      AND qd.is_public = true
      AND q.status = 'published'
  );
$$;
REVOKE ALL ON FUNCTION public.public_quote_document_file_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_quote_document_file_allowed(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.public_quote_document_file_allowed(text) IS 'Boolean-only gate for existing public quote attachments. Exact file match, explicit public document, published parent; no table read grants. Share-token/code validity and expiry remain enforced by the unchanged public document listing RPCs. Preserves existing direct-file authorization for compatibility with the published frontend.';
ALTER POLICY "Public can read shared quote documents" ON storage.objects
USING (bucket_id = 'quote-documents' AND public.public_quote_document_file_allowed(name));