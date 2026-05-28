ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trips_opportunity_id
  ON public.trips(opportunity_id) WHERE opportunity_id IS NOT NULL;