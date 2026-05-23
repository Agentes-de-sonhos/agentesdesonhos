CREATE TABLE IF NOT EXISTS public.activity_photo_cache (
  query_key text PRIMARY KEY,
  photo_url text,
  thumb_url text,
  place_id text,
  source text NOT NULL DEFAULT 'google_places',
  attributions text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_photo_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activity_photo_cache"
ON public.activity_photo_cache
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert activity_photo_cache"
ON public.activity_photo_cache
FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update activity_photo_cache"
ON public.activity_photo_cache
FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_photo_cache_created_at
ON public.activity_photo_cache (created_at DESC);