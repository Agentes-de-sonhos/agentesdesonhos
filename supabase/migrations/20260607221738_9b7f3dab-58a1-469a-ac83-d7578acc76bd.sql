ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Backfill positions per (user_id, stage_id) ordered by created_at desc (newest on top, like current view)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, COALESCE(stage_id::text, stage) ORDER BY created_at DESC) - 1 AS rn
  FROM public.opportunities
)
UPDATE public.opportunities o
SET position = ranked.rn
FROM ranked
WHERE o.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_opportunities_stage_position ON public.opportunities(user_id, stage_id, position);