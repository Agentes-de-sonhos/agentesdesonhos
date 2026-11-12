CREATE TABLE public.club_med_place_cache (
  slug text PRIMARY KEY,
  place_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ok',
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.club_med_place_cache TO service_role;
ALTER TABLE public.club_med_place_cache ENABLE ROW LEVEL SECURITY;
-- Sem policies: leitura e escrita apenas pela função de servidor (service role).