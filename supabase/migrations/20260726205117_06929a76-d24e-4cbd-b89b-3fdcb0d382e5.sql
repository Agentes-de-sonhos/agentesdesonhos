
ALTER TABLE public.news_collector_runs
  ADD COLUMN IF NOT EXISTS updated_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invalid_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS others_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

ALTER TABLE public.noticias_brutas
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_noticias_brutas_content_hash
  ON public.noticias_brutas(content_hash)
  WHERE content_hash IS NOT NULL;
