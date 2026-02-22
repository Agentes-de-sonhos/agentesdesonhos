
-- Tabela de notícias brutas (coletadas dos feeds)
CREATE TABLE public.noticias_brutas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo_original TEXT NOT NULL,
  conteudo TEXT,
  fonte TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  data_publicacao TIMESTAMP WITH TIME ZONE,
  data_coleta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de notícias curadas para o dashboard
CREATE TABLE public.noticias_dashboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  noticia_bruta_id UUID REFERENCES public.noticias_brutas(id) ON DELETE SET NULL,
  titulo_curto TEXT NOT NULL,
  resumo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  fonte TEXT NOT NULL,
  url_original TEXT NOT NULL,
  relevancia_score INTEGER NOT NULL DEFAULT 0,
  tipo_exibicao TEXT NOT NULL DEFAULT 'secundaria',
  status TEXT NOT NULL DEFAULT 'pendente',
  data_publicacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.noticias_brutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticias_dashboard ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage noticias_brutas
CREATE POLICY "Admins can manage noticias_brutas"
ON public.noticias_brutas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Edge functions (service role) can insert noticias_brutas
CREATE POLICY "Service role can insert noticias_brutas"
ON public.noticias_brutas
FOR INSERT
WITH CHECK (true);

-- RLS: Admins can manage noticias_dashboard
CREATE POLICY "Admins can manage noticias_dashboard"
ON public.noticias_dashboard
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Everyone can read approved noticias_dashboard
CREATE POLICY "Anyone can read approved noticias_dashboard"
ON public.noticias_dashboard
FOR SELECT
USING (status = 'aprovado');

-- Indexes
CREATE INDEX idx_noticias_brutas_url ON public.noticias_brutas(url);
CREATE INDEX idx_noticias_brutas_processado ON public.noticias_brutas(processado);
CREATE INDEX idx_noticias_dashboard_status ON public.noticias_dashboard(status);
CREATE INDEX idx_noticias_dashboard_relevancia ON public.noticias_dashboard(relevancia_score DESC);

-- Trigger for updated_at
CREATE TRIGGER update_noticias_dashboard_updated_at
BEFORE UPDATE ON public.noticias_dashboard
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
