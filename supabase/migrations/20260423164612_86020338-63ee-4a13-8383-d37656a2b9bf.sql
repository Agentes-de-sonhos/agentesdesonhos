-- Adiciona campos separados de adultos e crianças nas oportunidades
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS adults_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children_count integer NOT NULL DEFAULT 0;

-- Backfill: assume que registros antigos tinham todos como adultos
UPDATE public.opportunities
SET adults_count = GREATEST(passengers_count, 1),
    children_count = 0
WHERE adults_count = 1 AND children_count = 0 AND passengers_count > 0;

-- Constraints de sanidade
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_adults_count_check CHECK (adults_count >= 0),
  ADD CONSTRAINT opportunities_children_count_check CHECK (children_count >= 0);