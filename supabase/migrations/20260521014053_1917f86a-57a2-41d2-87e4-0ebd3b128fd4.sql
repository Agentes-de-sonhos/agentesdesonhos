-- Tabela de logs da importação inteligente aérea
CREATE TABLE IF NOT EXISTS public.airfare_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quote_id UUID NULL,
  file_url TEXT NULL,
  file_name TEXT NULL,
  file_mime TEXT NULL,
  raw_ai_response JSONB NULL,
  parsed_data JSONB NULL,
  confidence_score NUMERIC NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airfare_import_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_airfare_import_logs_user
  ON public.airfare_import_logs(user_id, created_at DESC);

CREATE POLICY "Users can view own airfare import logs"
ON public.airfare_import_logs FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own airfare import logs"
ON public.airfare_import_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own airfare import logs"
ON public.airfare_import_logs FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own airfare import logs"
ON public.airfare_import_logs FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_airfare_import_logs_updated_at
BEFORE UPDATE ON public.airfare_import_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para arquivos originais
INSERT INTO storage.buckets (id, name, public)
VALUES ('airfare-imports', 'airfare-imports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own airfare imports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'airfare-imports'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can upload own airfare imports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'airfare-imports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own airfare imports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'airfare-imports'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);