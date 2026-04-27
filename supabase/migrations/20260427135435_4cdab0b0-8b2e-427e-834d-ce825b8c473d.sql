CREATE TABLE public.news_curation_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  noticia_id UUID,
  titulo TEXT NOT NULL,
  resumo TEXT,
  categoria TEXT,
  fonte TEXT,
  score_ia INTEGER,
  score_final INTEGER,
  decisao TEXT NOT NULL CHECK (decisao IN ('aprovado','rejeitado')),
  motivo TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_feedback_created ON public.news_curation_feedback (created_at DESC);
CREATE INDEX idx_news_feedback_decisao ON public.news_curation_feedback (decisao);

ALTER TABLE public.news_curation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage news_curation_feedback"
ON public.news_curation_feedback
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));