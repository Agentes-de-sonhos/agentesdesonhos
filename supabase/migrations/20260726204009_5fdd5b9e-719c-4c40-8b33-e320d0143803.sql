
-- ============================================================
-- Fase 1: Reformulação Notícias do Trade
-- ============================================================

-- 1) Novas colunas em noticias_dashboard
ALTER TABLE public.noticias_dashboard
  ADD COLUMN IF NOT EXISTS reads_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC;

CREATE INDEX IF NOT EXISTS idx_noticias_dashboard_hidden ON public.noticias_dashboard(hidden) WHERE hidden = false;
CREATE INDEX IF NOT EXISTS idx_noticias_dashboard_data_pub ON public.noticias_dashboard(data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_dashboard_categoria ON public.noticias_dashboard(categoria);
CREATE INDEX IF NOT EXISTS idx_noticias_dashboard_fonte ON public.noticias_dashboard(fonte);

-- Backfill: mapear categoria antiga
UPDATE public.noticias_dashboard SET categoria = 'Outros' WHERE categoria = 'Turismo';

-- Backfill likes_count com dados atuais
UPDATE public.noticias_dashboard nd
SET likes_count = COALESCE(sub.c, 0)
FROM (SELECT noticia_id, COUNT(*)::int AS c FROM public.news_likes GROUP BY noticia_id) sub
WHERE sub.noticia_id = nd.id;

-- 2) Tabela news_reads
CREATE TABLE IF NOT EXISTS public.news_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  noticia_id UUID NOT NULL REFERENCES public.noticias_dashboard(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  UNIQUE (noticia_id, user_id, read_date)
);

GRANT SELECT, INSERT ON public.news_reads TO authenticated;
GRANT ALL ON public.news_reads TO service_role;

ALTER TABLE public.news_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reads" ON public.news_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reads" ON public.news_reads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reads" ON public.news_reads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_news_reads_noticia ON public.news_reads(noticia_id);
CREATE INDEX IF NOT EXISTS idx_news_reads_read_at ON public.news_reads(read_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_reads_date ON public.news_reads(read_date DESC);

-- 3) Tabela news_collector_runs
CREATE TABLE IF NOT EXISTS public.news_collector_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  found_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  skipped_duplicates_count INTEGER NOT NULL DEFAULT 0,
  broken_links_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger_source TEXT NOT NULL DEFAULT 'cron',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.news_collector_runs TO authenticated;
GRANT ALL ON public.news_collector_runs TO service_role;

ALTER TABLE public.news_collector_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view collector runs" ON public.news_collector_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage collector runs" ON public.news_collector_runs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_news_collector_runs_started ON public.news_collector_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_collector_runs_portal ON public.news_collector_runs(portal, started_at DESC);

-- 4) Triggers de contagem
CREATE OR REPLACE FUNCTION public.tg_news_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.noticias_dashboard SET likes_count = likes_count + 1 WHERE id = NEW.noticia_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.noticias_dashboard SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.noticia_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_likes_count ON public.news_likes;
CREATE TRIGGER trg_news_likes_count
AFTER INSERT OR DELETE ON public.news_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_news_likes_count();

CREATE OR REPLACE FUNCTION public.tg_news_reads_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.noticias_dashboard SET reads_count = reads_count + 1 WHERE id = NEW.noticia_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_reads_count ON public.news_reads;
CREATE TRIGGER trg_news_reads_count
AFTER INSERT ON public.news_reads
FOR EACH ROW EXECUTE FUNCTION public.tg_news_reads_count();

-- 5) RPC: register_news_read (idempotente)
CREATE OR REPLACE FUNCTION public.register_news_read(p_noticia_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_inserted BOOLEAN := FALSE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.news_reads (noticia_id, user_id)
  VALUES (p_noticia_id, v_user)
  ON CONFLICT (noticia_id, user_id, read_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_news_read(UUID) TO authenticated;

-- 6) RPC: news_ranking — retorna Top N para janela 'day' ou 'week'
CREATE OR REPLACE FUNCTION public.news_ranking(p_window TEXT DEFAULT 'day', p_limit INT DEFAULT 5)
RETURNS TABLE (
  id UUID,
  titulo_curto TEXT,
  resumo TEXT,
  categoria TEXT,
  fonte TEXT,
  url_original TEXT,
  data_publicacao TIMESTAMPTZ,
  reads_count INTEGER,
  likes_count INTEGER,
  window_reads INTEGER,
  window_likes INTEGER,
  score INTEGER,
  rank_position INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
BEGIN
  IF p_window = 'week' THEN
    v_start := date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
  ELSE
    v_start := date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
  END IF;

  RETURN QUERY
  WITH r AS (
    SELECT nr.noticia_id, COUNT(*)::int AS c
    FROM public.news_reads nr
    WHERE nr.read_at >= v_start
    GROUP BY nr.noticia_id
  ),
  l AS (
    SELECT nl.noticia_id, COUNT(*)::int AS c
    FROM public.news_likes nl
    WHERE nl.created_at >= v_start
    GROUP BY nl.noticia_id
  ),
  scored AS (
    SELECT
      nd.id, nd.titulo_curto, nd.resumo, nd.categoria, nd.fonte, nd.url_original, nd.data_publicacao,
      nd.reads_count, nd.likes_count,
      COALESCE(r.c, 0) AS window_reads,
      COALESCE(l.c, 0) AS window_likes,
      (COALESCE(r.c, 0) + COALESCE(l.c, 0) * 2) AS score
    FROM public.noticias_dashboard nd
    LEFT JOIN r ON r.noticia_id = nd.id
    LEFT JOIN l ON l.noticia_id = nd.id
    WHERE nd.status = 'aprovado' AND nd.hidden = false
      AND nd.data_publicacao >= v_start - interval '3 days'
  )
  SELECT
    s.id, s.titulo_curto, s.resumo, s.categoria, s.fonte, s.url_original, s.data_publicacao,
    s.reads_count, s.likes_count, s.window_reads, s.window_likes, s.score,
    ROW_NUMBER() OVER (ORDER BY s.score DESC, s.window_likes DESC, s.window_reads DESC, s.data_publicacao DESC)::int AS rank_position
  FROM scored s
  ORDER BY s.score DESC, s.window_likes DESC, s.window_reads DESC, s.data_publicacao DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.news_ranking(TEXT, INT) TO authenticated;

-- 7) Atualizar RLS de noticias_dashboard para novos filtros (agentes só veem aprovado + não hidden)
DROP POLICY IF EXISTS "Authenticated users can view approved" ON public.noticias_dashboard;
DROP POLICY IF EXISTS "Users can view approved noticias" ON public.noticias_dashboard;
DROP POLICY IF EXISTS "Public can view approved noticias" ON public.noticias_dashboard;

CREATE POLICY "Authenticated view approved visible"
  ON public.noticias_dashboard
  FOR SELECT
  TO authenticated
  USING (status = 'aprovado' AND hidden = false);

-- Garantir grant para authenticated (leitura pública através da RLS)
GRANT SELECT ON public.noticias_dashboard TO authenticated;
