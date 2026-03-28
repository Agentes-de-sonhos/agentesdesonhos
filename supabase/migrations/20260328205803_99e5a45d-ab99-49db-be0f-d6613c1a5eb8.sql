CREATE INDEX IF NOT EXISTS idx_air_blocks_origin ON public.air_blocks (origin);
CREATE INDEX IF NOT EXISTS idx_air_blocks_destination ON public.air_blocks (destination);
CREATE INDEX IF NOT EXISTS idx_air_blocks_departure_date ON public.air_blocks (departure_date);
CREATE INDEX IF NOT EXISTS idx_air_blocks_airline ON public.air_blocks (airline);
CREATE INDEX IF NOT EXISTS idx_air_blocks_origin_dest ON public.air_blocks (origin, destination, departure_date);