
-- Add new columns to air_blocks for full flight structure
ALTER TABLE public.air_blocks 
  ADD COLUMN IF NOT EXISTS arrival_date text,
  ADD COLUMN IF NOT EXISTS arrival_time text,
  ADD COLUMN IF NOT EXISTS return_departure_date text,
  ADD COLUMN IF NOT EXISTS return_departure_time text,
  ADD COLUMN IF NOT EXISTS return_arrival_date text,
  ADD COLUMN IF NOT EXISTS return_arrival_time text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BRL';

-- Rename return_date/return_time to avoid confusion (keep old columns for backward compat)
-- The new columns return_departure_date/time and return_arrival_date/time replace them
