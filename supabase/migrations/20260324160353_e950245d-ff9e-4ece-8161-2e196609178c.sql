
CREATE TABLE public.hotel_rx_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  hotel_name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_hotel_rx_cache_key ON public.hotel_rx_cache (cache_key);
CREATE INDEX idx_hotel_rx_cache_created ON public.hotel_rx_cache (created_at);

ALTER TABLE public.hotel_rx_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hotel rx cache"
  ON public.hotel_rx_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert hotel rx cache"
  ON public.hotel_rx_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);
