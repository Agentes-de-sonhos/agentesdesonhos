
CREATE TABLE public.place_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  photo_url text,
  photo_urls text[] DEFAULT '{}',
  place_type text,
  latitude double precision,
  longitude double precision,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.place_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read place_cache" ON public.place_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert place_cache" ON public.place_cache
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update place_cache" ON public.place_cache
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
