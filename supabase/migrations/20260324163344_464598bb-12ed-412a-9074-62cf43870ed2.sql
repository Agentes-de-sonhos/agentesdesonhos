ALTER TABLE public.hotel_rx_cache 
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_hotel_rx_cache_place_id ON public.hotel_rx_cache(place_id);
