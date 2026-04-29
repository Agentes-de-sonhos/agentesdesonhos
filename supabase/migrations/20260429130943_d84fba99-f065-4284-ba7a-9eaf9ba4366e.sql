
-- Adiciona campos de score "ajustado ao perfil do curador" (aprendizado)
ALTER TABLE public.noticias_dashboard
  ADD COLUMN IF NOT EXISTS score_perfil INTEGER,
  ADD COLUMN IF NOT EXISTS aderencia_perfil TEXT,
  ADD COLUMN IF NOT EXISTS score_explicacao TEXT;

-- Constraint: aderencia só aceita valores conhecidos (ou NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'noticias_dashboard_aderencia_check'
  ) THEN
    ALTER TABLE public.noticias_dashboard
      ADD CONSTRAINT noticias_dashboard_aderencia_check
      CHECK (aderencia_perfil IS NULL OR aderencia_perfil IN ('baixa','media','alta'));
  END IF;
END $$;

-- Índice para ordenação combinada
CREATE INDEX IF NOT EXISTS idx_noticias_dashboard_score_perfil
  ON public.noticias_dashboard (score_perfil DESC NULLS LAST, relevancia_score DESC);

-- RPC: estatísticas de curadoria (para nível de confiança do aprendizado)
CREATE OR REPLACE FUNCTION public.get_news_curation_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_feedback INTEGER;
  total_aprovados INTEGER;
  total_rejeitados INTEGER;
  feedback_30d INTEGER;
  nivel TEXT;
BEGIN
  SELECT COUNT(*) INTO total_feedback FROM public.news_curation_feedback;
  SELECT COUNT(*) INTO total_aprovados FROM public.news_curation_feedback WHERE decisao = 'aprovado';
  SELECT COUNT(*) INTO total_rejeitados FROM public.news_curation_feedback WHERE decisao = 'rejeitado';
  SELECT COUNT(*) INTO feedback_30d FROM public.news_curation_feedback WHERE created_at >= now() - interval '30 days';

  -- Nível de aderência baseado em volume total de feedback
  IF total_feedback >= 100 THEN nivel := 'alta';
  ELSIF total_feedback >= 30 THEN nivel := 'media';
  ELSE nivel := 'baixa';
  END IF;

  RETURN json_build_object(
    'total_feedback', total_feedback,
    'total_aprovados', total_aprovados,
    'total_rejeitados', total_rejeitados,
    'feedback_30d', feedback_30d,
    'nivel_aderencia', nivel
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_news_curation_stats() TO authenticated;
