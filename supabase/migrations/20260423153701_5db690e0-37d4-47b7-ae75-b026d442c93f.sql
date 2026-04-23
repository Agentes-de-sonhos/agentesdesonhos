-- 1. Tabela de documentos do orçamento
CREATE TABLE public.quote_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_documents_quote_id ON public.quote_documents(quote_id);
CREATE INDEX idx_quote_documents_user_id ON public.quote_documents(user_id);

ALTER TABLE public.quote_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quote documents"
ON public.quote_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quote documents"
ON public.quote_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quote documents"
ON public.quote_documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quote documents"
ON public.quote_documents FOR DELETE
USING (auth.uid() = user_id);

-- 2. Bucket privado para os documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-documents', 'quote-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage (path: <user_id>/<quote_id>/<file>)
CREATE POLICY "Users can view their own quote document files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'quote-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own quote document files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'quote-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own quote document files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'quote-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own quote document files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'quote-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);