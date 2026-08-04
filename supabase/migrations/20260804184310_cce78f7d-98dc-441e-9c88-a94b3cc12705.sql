-- 1. Histórico auditável: extensão aditiva das tabelas existentes
ALTER TABLE public.raffles
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS academy_training_id UUID,
  ADD COLUMN IF NOT EXISTS academy_trail_id UUID,
  ADD COLUMN IF NOT EXISTS event_label TEXT,
  ADD COLUMN IF NOT EXISTS filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS draw_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS eligible_count INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raffles_source_check'
  ) THEN
    ALTER TABLE public.raffles
      ADD CONSTRAINT raffles_source_check CHECK (source IN ('file', 'academy_event'));
  END IF;
END $$;

ALTER TABLE public.raffle_winners
  ADD COLUMN IF NOT EXISTS position INT,
  ADD COLUMN IF NOT EXISTS prize TEXT;

CREATE INDEX IF NOT EXISTS idx_raffles_academy_training
  ON public.raffles(academy_training_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raffles_created_at ON public.raffles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raffle_winners_user ON public.raffle_winners(user_id, drawn_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffles TO authenticated;
GRANT ALL ON public.raffles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffle_winners TO authenticated;
GRANT ALL ON public.raffle_winners TO service_role;

-- 2. Eventos reais da Academy (treinamentos) com contagem de inscritos
CREATE OR REPLACE FUNCTION public.academy_raffle_events()
RETURNS TABLE (
  training_id UUID,
  title TEXT,
  training_type TEXT,
  scheduled_at TIMESTAMPTZ,
  is_active BOOLEAN,
  trail_id UUID,
  trail_name TEXT,
  destination TEXT,
  registrations_count BIGINT,
  attended_count BIGINT,
  completed_count BIGINT,
  last_activity_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.title,
    t.training_type,
    t.scheduled_at,
    t.is_active,
    tr.id,
    tr.name,
    tr.destination,
    COALESCE(p.total, 0),
    COALESCE(p.attended, 0),
    COALESCE(p.completed, 0),
    p.last_activity_at
  FROM public.trainings t
  LEFT JOIN LATERAL (
    SELECT tt.trail_id FROM public.trail_trainings tt
    WHERE tt.training_id = t.id
    ORDER BY tt.order_index
    LIMIT 1
  ) ttl ON TRUE
  LEFT JOIN public.learning_trails tr ON tr.id = ttl.trail_id
  LEFT JOIN LATERAL (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE utp.watched_minutes > 0 OR utp.is_completed)::bigint AS attended,
      count(*) FILTER (WHERE utp.is_completed)::bigint AS completed,
      max(utp.updated_at) AS last_activity_at
    FROM public.user_training_progress utp
    WHERE utp.training_id = t.id
  ) p ON TRUE
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY COALESCE(t.scheduled_at, p.last_activity_at, t.created_at) DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.academy_raffle_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.academy_raffle_events() FROM anon;
GRANT EXECUTE ON FUNCTION public.academy_raffle_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_raffle_events() TO service_role;

-- 3. Participantes reais de um evento da Academy
CREATE OR REPLACE FUNCTION public.academy_event_participants(p_training_id UUID)
RETURNS TABLE (
  participant_user_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  agency_name TEXT,
  city TEXT,
  state TEXT,
  enrolled_at TIMESTAMPTZ,
  is_completed BOOLEAN,
  watched_minutes INT,
  survey_answered BOOLEAN,
  survey_score INT,
  events_participated BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;

  RETURN QUERY
  SELECT
    utp.user_id,
    pr.name,
    au.email::text,
    pr.phone,
    pr.agency_name,
    pr.city,
    pr.state,
    utp.created_at,
    utp.is_completed,
    utp.watched_minutes,
    (qa.attempts IS NOT NULL AND qa.attempts > 0),
    qa.best_score,
    COALESCE(rec.total_events, 0)
  FROM public.user_training_progress utp
  LEFT JOIN public.profiles pr ON pr.user_id = utp.user_id
  LEFT JOIN auth.users au ON au.id = utp.user_id
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS attempts, max(uqa.score) AS best_score
    FROM public.user_quiz_attempts uqa
    WHERE uqa.training_id = utp.training_id AND uqa.user_id = utp.user_id
  ) qa ON TRUE
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT x.training_id)::bigint AS total_events
    FROM public.user_training_progress x
    WHERE x.user_id = utp.user_id
  ) rec ON TRUE
  WHERE utp.training_id = p_training_id;
END;
$$;

REVOKE ALL ON FUNCTION public.academy_event_participants(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.academy_event_participants(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.academy_event_participants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_event_participants(UUID) TO service_role;