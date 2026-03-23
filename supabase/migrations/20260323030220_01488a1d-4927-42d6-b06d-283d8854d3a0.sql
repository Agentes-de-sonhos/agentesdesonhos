
-- Travelers table
CREATE TABLE public.travelers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  data_nascimento DATE,
  cpf TEXT,
  passaporte TEXT,
  validade_passaporte DATE,
  nacionalidade TEXT,
  observacoes TEXT,
  is_responsavel BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Traveler documents table
CREATE TABLE public.traveler_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  traveler_id UUID NOT NULL REFERENCES public.travelers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL DEFAULT 'outros',
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_documents ENABLE ROW LEVEL SECURITY;

-- Travelers RLS policies
CREATE POLICY "Users can manage own travelers" ON public.travelers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Traveler documents RLS policies
CREATE POLICY "Users can manage own traveler documents" ON public.traveler_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for traveler documents
INSERT INTO storage.buckets (id, name, public) VALUES ('traveler-documents', 'traveler-documents', true);

-- Storage RLS
CREATE POLICY "Users can upload traveler docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'traveler-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view traveler docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'traveler-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete traveler docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'traveler-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Updated_at trigger
CREATE TRIGGER update_travelers_updated_at
  BEFORE UPDATE ON public.travelers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
