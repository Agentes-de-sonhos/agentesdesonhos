
-- =====================================================================
-- Fase 3 — Destaques do Mês: apuração, confirmação e histórico
-- =====================================================================

-- 1) Idempotência: apenas UM vencedor por prêmio.
ALTER TABLE public.community_award_winners
  ADD COLUMN IF NOT EXISTS contributions_count int,
  ADD COLUMN IF NOT EXISTS active_days_count int,
  ADD COLUMN IF NOT EXISTS third_party_replies_count int,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'community_award_winners_award_id_unique'
  ) THEN
    ALTER TABLE public.community_award_winners
      ADD CONSTRAINT community_award_winners_award_id_unique UNIQUE (award_id);
  END IF;
END $$;

-- Public read of published winners (histórico) — write remains admin only.
DROP POLICY IF EXISTS "Public can view published winners" ON public.community_award_winners;
CREATE POLICY "Public can view published winners"
  ON public.community_award_winners
  FOR SELECT
  TO authenticated
  USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage winners" ON public.community_award_winners;
CREATE POLICY "Admins manage winners"
  ON public.community_award_winners
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- 2) get_award_tally(_award_id): apuração completa para administradores.
--    Retorna uma linha por indicado com contagens, respostas a terceiros
--    e sinalização de inelegibilidade histórica.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_award_tally(_award_id uuid)
RETURNS TABLE(
  award_id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  agency_name text,
  eligible boolean,
  exclusion_reason text,
  votes_count int,
  contributions_count int,
  active_days_count int,
  third_party_replies_count int,
  wins_this_year int,
  won_previous_month boolean,
  disqualified_by_history boolean,
  history_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.community_monthly_awards;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_prev_month int;
  v_prev_year int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_award FROM public.community_monthly_awards WHERE id = _award_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'award_not_found' USING ERRCODE = '22023';
  END IF;

  v_month_start := (make_date(v_award.reference_year, v_award.reference_month, 1)::timestamp
                    AT TIME ZONE 'America/Sao_Paulo');
  v_month_end := ((make_date(v_award.reference_year, v_award.reference_month, 1) + interval '1 month')::timestamp
                    AT TIME ZONE 'America/Sao_Paulo');

  IF v_award.reference_month = 1 THEN
    v_prev_month := 12; v_prev_year := v_award.reference_year - 1;
  ELSE
    v_prev_month := v_award.reference_month - 1; v_prev_year := v_award.reference_year;
  END IF;

  RETURN QUERY
  WITH votes AS (
    SELECT v.nominee_user_id AS uid, COUNT(*)::int AS votes
      FROM public.community_monthly_votes v
     WHERE v.award_id = _award_id
     GROUP BY v.nominee_user_id
  ),
  third_party AS (
    SELECT uid, SUM(cnt)::int AS third_party_replies
    FROM (
      -- Answers to questions authored by someone else
      SELECT a.user_id AS uid, COUNT(*)::int AS cnt
        FROM public.qa_answers a
        JOIN public.qa_questions q ON q.id = a.question_id
       WHERE a.created_at >= v_month_start AND a.created_at < v_month_end
         AND q.user_id <> a.user_id
       GROUP BY a.user_id
      UNION ALL
      -- Comments on posts authored by someone else
      SELECT c.user_id AS uid, COUNT(*)::int AS cnt
        FROM public.community_post_comments c
        JOIN public.community_posts p ON p.id = c.post_id
       WHERE c.created_at >= v_month_start AND c.created_at < v_month_end
         AND p.user_id <> c.user_id
       GROUP BY c.user_id
    ) x
    GROUP BY uid
  ),
  wins AS (
    SELECT w.user_id AS uid,
           COUNT(*) FILTER (WHERE w.reference_year = v_award.reference_year
                              AND w.id IS NOT NULL
                              AND (w.reference_year, w.reference_month) <> (v_award.reference_year, v_award.reference_month)
                           )::int AS wins_year,
           bool_or(w.reference_year = v_prev_year AND w.reference_month = v_prev_month) AS prev_month
      FROM public.community_award_winners w
     WHERE w.user_id IS NOT NULL
     GROUP BY w.user_id
  )
  SELECT
    _award_id,
    n.user_id,
    p.name,
    p.avatar_url,
    p.agency_name,
    n.eligible,
    n.exclusion_reason,
    COALESCE(votes.votes, 0),
    n.contributions_count,
    n.active_days_count,
    COALESCE(third_party.third_party_replies, 0),
    COALESCE(wins.wins_year, 0),
    COALESCE(wins.prev_month, false),
    (COALESCE(wins.wins_year, 0) >= v_award.max_wins_per_year)
      OR (NOT v_award.allow_consecutive_wins AND COALESCE(wins.prev_month, false)),
    CASE
      WHEN COALESCE(wins.wins_year, 0) >= v_award.max_wins_per_year
        THEN 'max_wins_per_year_reached'
      WHEN NOT v_award.allow_consecutive_wins AND COALESCE(wins.prev_month, false)
        THEN 'won_previous_month'
      ELSE NULL
    END
  FROM public.community_monthly_nominees n
  LEFT JOIN public.profiles_public p ON p.user_id = n.user_id
  LEFT JOIN votes ON votes.uid = n.user_id
  LEFT JOIN third_party ON third_party.uid = n.user_id
  LEFT JOIN wins ON wins.uid = n.user_id
  WHERE n.award_id = _award_id
  ORDER BY
    (n.eligible AND NOT (
      (COALESCE(wins.wins_year, 0) >= v_award.max_wins_per_year)
      OR (NOT v_award.allow_consecutive_wins AND COALESCE(wins.prev_month, false))
    )) DESC,
    COALESCE(votes.votes, 0) DESC,
    n.contributions_count DESC NULLS LAST,
    n.active_days_count DESC NULLS LAST,
    COALESCE(third_party.third_party_replies, 0) DESC,
    p.name ASC NULLS LAST;
END $$;

REVOKE ALL ON FUNCTION public.get_award_tally(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_award_tally(uuid) TO authenticated;

-- =====================================================================
-- 3) confirm_award_winner: registra vencedor de forma imutável e publica.
--    Idempotente: se já existe winner para o prêmio, retorna o mesmo.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.confirm_award_winner(
  _award_id uuid,
  _winner_user_id uuid,
  _tie_break_reason text DEFAULT NULL
)
RETURNS public.community_award_winners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.community_monthly_awards;
  v_nominee public.community_monthly_nominees;
  v_votes int;
  v_wins_year int;
  v_prev_month int;
  v_prev_year int;
  v_won_prev boolean;
  v_third_party int;
  v_winner public.community_award_winners;
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_award FROM public.community_monthly_awards WHERE id = _award_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'award_not_found' USING ERRCODE = '22023'; END IF;

  IF v_award.voting_end_at IS NULL OR now() < v_award.voting_end_at THEN
    RAISE EXCEPTION 'voting_still_open' USING ERRCODE = '22023';
  END IF;

  -- Idempotência
  SELECT * INTO v_winner FROM public.community_award_winners WHERE award_id = _award_id;
  IF FOUND THEN
    RETURN v_winner;
  END IF;

  SELECT * INTO v_nominee
    FROM public.community_monthly_nominees
   WHERE award_id = _award_id AND user_id = _winner_user_id;

  IF NOT FOUND OR NOT v_nominee.eligible THEN
    RAISE EXCEPTION 'winner_not_eligible' USING ERRCODE = '22023';
  END IF;

  -- Histórico: 2 vitórias/ano e regra de meses consecutivos.
  IF v_award.reference_month = 1 THEN
    v_prev_month := 12; v_prev_year := v_award.reference_year - 1;
  ELSE
    v_prev_month := v_award.reference_month - 1; v_prev_year := v_award.reference_year;
  END IF;

  SELECT COUNT(*)::int INTO v_wins_year
    FROM public.community_award_winners
   WHERE user_id = _winner_user_id
     AND reference_year = v_award.reference_year
     AND (reference_year, reference_month) <> (v_award.reference_year, v_award.reference_month);

  SELECT EXISTS(
    SELECT 1 FROM public.community_award_winners
     WHERE user_id = _winner_user_id
       AND reference_year = v_prev_year
       AND reference_month = v_prev_month
  ) INTO v_won_prev;

  IF v_wins_year >= v_award.max_wins_per_year THEN
    RAISE EXCEPTION 'max_wins_per_year_reached' USING ERRCODE = '22023';
  END IF;

  IF NOT v_award.allow_consecutive_wins AND v_won_prev THEN
    RAISE EXCEPTION 'won_previous_month' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*)::int INTO v_votes
    FROM public.community_monthly_votes
   WHERE award_id = _award_id AND nominee_user_id = _winner_user_id;

  -- Respostas a terceiros no mês (métrica de auditoria)
  SELECT COALESCE(SUM(cnt),0)::int INTO v_third_party FROM (
    SELECT COUNT(*) AS cnt
      FROM public.qa_answers a
      JOIN public.qa_questions q ON q.id = a.question_id
     WHERE a.user_id = _winner_user_id
       AND q.user_id <> a.user_id
       AND a.created_at >= (make_date(v_award.reference_year, v_award.reference_month, 1)::timestamp
                            AT TIME ZONE 'America/Sao_Paulo')
       AND a.created_at < ((make_date(v_award.reference_year, v_award.reference_month, 1) + interval '1 month')::timestamp
                           AT TIME ZONE 'America/Sao_Paulo')
    UNION ALL
    SELECT COUNT(*)
      FROM public.community_post_comments c
      JOIN public.community_posts p ON p.id = c.post_id
     WHERE c.user_id = _winner_user_id
       AND p.user_id <> c.user_id
       AND c.created_at >= (make_date(v_award.reference_year, v_award.reference_month, 1)::timestamp
                            AT TIME ZONE 'America/Sao_Paulo')
       AND c.created_at < ((make_date(v_award.reference_year, v_award.reference_month, 1) + interval '1 month')::timestamp
                           AT TIME ZONE 'America/Sao_Paulo')
  ) t;

  INSERT INTO public.community_award_winners(
    award_id, user_id, reference_month, reference_year,
    votes_count, tie_break_reason, published_at,
    contributions_count, active_days_count, third_party_replies_count, confirmed_by
  ) VALUES (
    _award_id, _winner_user_id, v_award.reference_month, v_award.reference_year,
    v_votes, _tie_break_reason, now(),
    v_nominee.contributions_count, v_nominee.active_days_count, v_third_party, v_admin
  )
  ON CONFLICT (award_id) DO NOTHING
  RETURNING * INTO v_winner;

  IF v_winner.id IS NULL THEN
    SELECT * INTO v_winner FROM public.community_award_winners WHERE award_id = _award_id;
  END IF;

  UPDATE public.community_monthly_awards
     SET winner_user_id = _winner_user_id,
         winner_votes = v_votes,
         status = 'completed',
         published_at = now(),
         updated_at = now()
   WHERE id = _award_id;

  RETURN v_winner;
END $$;

REVOKE ALL ON FUNCTION public.confirm_award_winner(uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.confirm_award_winner(uuid, uuid, text) TO authenticated;

-- =====================================================================
-- 4) revert_award_confirmation: reabre a apuração antes da divulgação.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.revert_award_confirmation(_award_id uuid)
RETURNS public.community_monthly_awards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.community_monthly_awards;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.community_award_winners WHERE award_id = _award_id;

  UPDATE public.community_monthly_awards
     SET winner_user_id = NULL,
         winner_votes = NULL,
         published_at = NULL,
         status = 'calculating',
         updated_at = now()
   WHERE id = _award_id
   RETURNING * INTO v_award;

  RETURN v_award;
END $$;

REVOKE ALL ON FUNCTION public.revert_award_confirmation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.revert_award_confirmation(uuid) TO authenticated;

-- =====================================================================
-- 5) list_award_history: histórico público de vencedores confirmados.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.list_award_history(_limit int DEFAULT 24)
RETURNS TABLE(
  award_id uuid,
  reference_month int,
  reference_year int,
  user_id uuid,
  name text,
  avatar_url text,
  agency_name text,
  votes_count int,
  contributions_count int,
  active_days_count int,
  third_party_replies_count int,
  tie_break_reason text,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.award_id, w.reference_month, w.reference_year,
    w.user_id, p.name, p.avatar_url, p.agency_name,
    w.votes_count, w.contributions_count, w.active_days_count,
    w.third_party_replies_count, w.tie_break_reason, w.published_at
  FROM public.community_award_winners w
  LEFT JOIN public.profiles_public p ON p.user_id = w.user_id
  WHERE w.published_at IS NOT NULL
  ORDER BY w.reference_year DESC, w.reference_month DESC
  LIMIT GREATEST(1, COALESCE(_limit, 24));
$$;

REVOKE ALL ON FUNCTION public.list_award_history(int) FROM public;
GRANT EXECUTE ON FUNCTION public.list_award_history(int) TO authenticated, anon;
