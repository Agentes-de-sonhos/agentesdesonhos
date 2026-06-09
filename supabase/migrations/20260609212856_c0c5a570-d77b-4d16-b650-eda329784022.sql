-- Deduplicate hotel_rx_cache rows by cache_key, keeping the most recently updated
WITH ranked AS (
  SELECT
    id,
    cache_key,
    ROW_NUMBER() OVER (
      PARTITION BY cache_key
      ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC
    ) AS rn
  FROM public.hotel_rx_cache
  WHERE cache_key IS NOT NULL
)
DELETE FROM public.hotel_rx_cache h
USING ranked r
WHERE h.id = r.id AND r.rn > 1;

-- Add unique constraint on cache_key (allows multiple NULLs by default in Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hotel_rx_cache_cache_key_unique'
  ) THEN
    ALTER TABLE public.hotel_rx_cache
      ADD CONSTRAINT hotel_rx_cache_cache_key_unique UNIQUE (cache_key);
  END IF;
END $$;