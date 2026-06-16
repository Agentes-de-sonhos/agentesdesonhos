
-- Fase 2: campos aditivos para o Roteiro V2 na Carteira Digital

-- trips: vínculo opcional a um itinerário V2 + modo de exibição
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS itinerary_id uuid NULL REFERENCES public.itineraries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS itinerary_mode text NOT NULL DEFAULT 'none';

-- CHECK constraint para itinerary_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trips_itinerary_mode_check'
  ) THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT trips_itinerary_mode_check
      CHECK (itinerary_mode IN ('none','legacy','v2'));
  END IF;
END $$;

-- Backfill determinístico: carteiras com dados legados marcadas como 'legacy'
UPDATE public.trips t
SET itinerary_mode = 'legacy'
WHERE itinerary_mode = 'none'
  AND EXISTS (
    SELECT 1 FROM public.trip_itinerary_activities a WHERE a.trip_id = t.id
  );

-- itineraries: rastreio do roteiro de origem em cópias
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS source_itinerary_id uuid NULL
    REFERENCES public.itineraries(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_trips_itinerary_id
  ON public.trips(itinerary_id) WHERE itinerary_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_itineraries_source
  ON public.itineraries(source_itinerary_id) WHERE source_itinerary_id IS NOT NULL;
