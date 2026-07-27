-- =========================================================================
-- COMMUNITY MONTHLY AWARDS (Destaques do Mês) — Phase 1 schema
-- =========================================================================

-- ------------------------- 1. community_monthly_awards -------------------
CREATE TABLE public.community_monthly_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_month int NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year int NOT NULL CHECK (reference_year BETWEEN 2024 AND 2100),
  title text,
  description text,
  prize_title text,
  prize_description text,
  prize_image_url text,
  sponsor_name text,
  rules text,
  extra_link text,
  extra_notes text,
  publish_date date,
  voting_start_at timestamptz,
  voting_end_at timestamptz,
  status text NOT NULL DEFAULT 'nominations'
    CHECK (status IN ('preparing','nominations','voting','calculating','completed','cancelled')),
  max_wins_per_year int NOT NULL DEFAULT 2 CHECK (max_wins_per_year BETWEEN 1 AND 12),
  allow_consecutive_wins boolean NOT NULL DEFAULT true,
  winner_user_id uuid,
  winner_votes int,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reference_month, reference_year)
);

GRANT SELECT ON public.community_monthly_awards TO authenticated;
GRANT ALL ON public.community_monthly_awards TO service_role;
ALTER TABLE public.community_monthly_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_awards_read_auth"
  ON public.community_monthly_awards
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "monthly_awards_admin_manage"
  ON public.community_monthly_awards
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_monthly_awards_updated_at
  BEFORE UPDATE ON public.community_monthly_awards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------- 2. community_monthly_nominees -----------------
CREATE TABLE public.community_monthly_nominees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id uuid NOT NULL REFERENCES public.community_monthly_awards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  posts_count int NOT NULL DEFAULT 0,
  questions_count int NOT NULL DEFAULT 0,
  answers_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  contributions_count int NOT NULL DEFAULT 0,
  active_days_count int NOT NULL DEFAULT 0,
  eligible boolean NOT NULL DEFAULT true,
  exclusion_reason text,
  first_contribution_at timestamptz,
  last_contribution_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (award_id, user_id)
);

CREATE INDEX idx_nominees_award ON public.community_monthly_nominees(award_id);
CREATE INDEX idx_nominees_user ON public.community_monthly_nominees(user_id);

GRANT SELECT ON public.community_monthly_nominees TO authenticated;
GRANT ALL ON public.community_monthly_nominees TO service_role;
ALTER TABLE public.community_monthly_nominees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_nominees_read_eligible"
  ON public.community_monthly_nominees
  FOR SELECT
  TO authenticated
  USING (eligible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "monthly_nominees_admin_manage"
  ON public.community_monthly_nominees
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_monthly_nominees_updated_at
  BEFORE UPDATE ON public.community_monthly_nominees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------- 3. community_monthly_votes --------------------
CREATE TABLE public.community_monthly_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id uuid NOT NULL REFERENCES public.community_monthly_awards(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL,
  nominee_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (award_id, voter_user_id),
  CHECK (voter_user_id <> nominee_user_id)
);

CREATE INDEX idx_votes_award_nominee ON public.community_monthly_votes(award_id, nominee_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_monthly_votes TO authenticated;
GRANT ALL ON public.community_monthly_votes TO service_role;
ALTER TABLE public.community_monthly_votes ENABLE ROW LEVEL SECURITY;

-- Phase 1: read your own vote OR admin (partial tally). No write policies yet
-- (writes will be added in Phase 2 alongside voting-window enforcement).
CREATE POLICY "monthly_votes_read_own_or_admin"
  ON public.community_monthly_votes
  FOR SELECT
  TO authenticated
  USING (voter_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "monthly_votes_admin_manage"
  ON public.community_monthly_votes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_monthly_votes_updated_at
  BEFORE UPDATE ON public.community_monthly_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------- 4. community_award_winners --------------------
CREATE TABLE public.community_award_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id uuid NOT NULL REFERENCES public.community_monthly_awards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reference_month int NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year int NOT NULL,
  votes_count int NOT NULL DEFAULT 0,
  tie_break_reason text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (award_id)
);

CREATE INDEX idx_winners_user ON public.community_award_winners(user_id);
CREATE INDEX idx_winners_year ON public.community_award_winners(reference_year);

GRANT SELECT ON public.community_award_winners TO authenticated;
GRANT ALL ON public.community_award_winners TO service_role;
ALTER TABLE public.community_award_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "award_winners_read_published"
  ON public.community_award_winners
  FOR SELECT
  TO authenticated
  USING (published_at IS NOT NULL OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "award_winners_admin_manage"
  ON public.community_award_winners
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- HELPER FUNCTIONS
-- =========================================================================

-- Ensure/update award row for the current month in America/Sao_Paulo TZ.
-- Voting window: last 7 days of the month (last_day - 6 days 00:00 → last_day 23:59:59).
CREATE OR REPLACE FUNCTION public.get_current_month_award()
RETURNS public.community_monthly_awards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local timestamp := (now() AT TIME ZONE 'America/Sao_Paulo');
  v_month int := extract(month from v_local)::int;
  v_year int := extract(year from v_local)::int;
  v_first date := make_date(v_year, v_month, 1);
  v_last date := (v_first + interval '1 month' - interval '1 day')::date;
  v_voting_start timestamptz;
  v_voting_end timestamptz;
  v_award public.community_monthly_awards;
BEGIN
  v_voting_start := ((v_last - interval '6 days')::timestamp AT TIME ZONE 'America/Sao_Paulo');
  v_voting_end := ((v_last::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'America/Sao_Paulo');

  SELECT * INTO v_award FROM public.community_monthly_awards
   WHERE reference_month = v_month AND reference_year = v_year;

  IF NOT FOUND THEN
    INSERT INTO public.community_monthly_awards(
      reference_month, reference_year, voting_start_at, voting_end_at, status
    ) VALUES (
      v_month, v_year, v_voting_start, v_voting_end, 'nominations'
    ) RETURNING * INTO v_award;
  ELSIF v_award.voting_start_at IS DISTINCT FROM v_voting_start
     OR v_award.voting_end_at IS DISTINCT FROM v_voting_end THEN
    UPDATE public.community_monthly_awards
       SET voting_start_at = v_voting_start,
           voting_end_at = v_voting_end,
           updated_at = now()
     WHERE id = v_award.id
     RETURNING * INTO v_award;
  END IF;

  RETURN v_award;
END $$;

GRANT EXECUTE ON FUNCTION public.get_current_month_award() TO authenticated, service_role;

-- Recompute (upsert) a single user's nominee row for the current month based
-- on their real contributions in that month (posts / questions / answers /
-- comments). Deletes the row if the user has no valid contribution left.
CREATE OR REPLACE FUNCTION public.recompute_monthly_nominee(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.community_monthly_awards;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_posts int;
  v_qs int;
  v_answers int;
  v_comments int;
  v_active_days int;
  v_first timestamptz;
  v_last timestamptz;
  v_is_agent boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  v_award := public.get_current_month_award();

  v_month_start := (make_date(v_award.reference_year, v_award.reference_month, 1)::timestamp
                    AT TIME ZONE 'America/Sao_Paulo');
  v_month_end := ((make_date(v_award.reference_year, v_award.reference_month, 1) + interval '1 month')::timestamp
                    AT TIME ZONE 'America/Sao_Paulo');

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = 'agente'
  ) INTO v_is_agent;

  SELECT COUNT(*) INTO v_posts FROM public.community_posts
   WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end;
  SELECT COUNT(*) INTO v_qs FROM public.qa_questions
   WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end;
  SELECT COUNT(*) INTO v_answers FROM public.qa_answers
   WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end;
  SELECT COUNT(*) INTO v_comments FROM public.community_post_comments
   WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end;

  SELECT COUNT(DISTINCT d) INTO v_active_days FROM (
    SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS d
      FROM public.community_posts
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
    UNION ALL
    SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date
      FROM public.qa_questions
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
    UNION ALL
    SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date
      FROM public.qa_answers
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
    UNION ALL
    SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date
      FROM public.community_post_comments
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
  ) t;

  SELECT MIN(c), MAX(c) INTO v_first, v_last FROM (
    SELECT created_at c FROM public.community_posts
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
    UNION ALL SELECT created_at FROM public.qa_questions
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
    UNION ALL SELECT created_at FROM public.qa_answers
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
    UNION ALL SELECT created_at FROM public.community_post_comments
     WHERE user_id = _user_id AND created_at >= v_month_start AND created_at < v_month_end
  ) t;

  IF (v_posts + v_qs + v_answers + v_comments) = 0 THEN
    DELETE FROM public.community_monthly_nominees
     WHERE award_id = v_award.id AND user_id = _user_id;
    RETURN;
  END IF;

  INSERT INTO public.community_monthly_nominees(
    award_id, user_id, posts_count, questions_count, answers_count,
    comments_count, contributions_count, active_days_count, eligible,
    exclusion_reason, first_contribution_at, last_contribution_at
  ) VALUES (
    v_award.id, _user_id, v_posts, v_qs, v_answers,
    v_comments, v_posts + v_qs + v_answers + v_comments, v_active_days,
    v_is_agent,
    CASE WHEN v_is_agent THEN NULL ELSE 'not_agent' END,
    v_first, v_last
  )
  ON CONFLICT (award_id, user_id) DO UPDATE
    SET posts_count = EXCLUDED.posts_count,
        questions_count = EXCLUDED.questions_count,
        answers_count = EXCLUDED.answers_count,
        comments_count = EXCLUDED.comments_count,
        contributions_count = EXCLUDED.contributions_count,
        active_days_count = EXCLUDED.active_days_count,
        eligible = CASE
          WHEN public.community_monthly_nominees.exclusion_reason IN ('admin_removed','fraud','spam')
            THEN false
          ELSE EXCLUDED.eligible
        END,
        first_contribution_at = LEAST(
          public.community_monthly_nominees.first_contribution_at,
          EXCLUDED.first_contribution_at
        ),
        last_contribution_at = GREATEST(
          public.community_monthly_nominees.last_contribution_at,
          EXCLUDED.last_contribution_at
        ),
        updated_at = now();
END $$;

GRANT EXECUTE ON FUNCTION public.recompute_monthly_nominee(uuid) TO authenticated, service_role;

-- Contribution trigger — refreshes the affected user's nominee row on any
-- insert/delete in the four contribution tables.
CREATE OR REPLACE FUNCTION public.trg_recompute_nominee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_monthly_nominee(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_monthly_nominee(NEW.user_id);
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER trg_nominee_from_posts
  AFTER INSERT OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_nominee();

CREATE TRIGGER trg_nominee_from_qa_questions
  AFTER INSERT OR DELETE ON public.qa_questions
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_nominee();

CREATE TRIGGER trg_nominee_from_qa_answers
  AFTER INSERT OR DELETE ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_nominee();

CREATE TRIGGER trg_nominee_from_comments
  AFTER INSERT OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_nominee();

-- =========================================================================
-- Backfill: ensure current-month award exists and populate nominees with
-- existing contributions from the current month.
-- =========================================================================
DO $$
DECLARE
  r record;
  v_month_start timestamptz := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')
                                 AT TIME ZONE 'America/Sao_Paulo');
BEGIN
  PERFORM public.get_current_month_award();

  FOR r IN (
    SELECT DISTINCT user_id FROM (
      SELECT user_id, created_at FROM public.community_posts
      UNION ALL SELECT user_id, created_at FROM public.qa_questions
      UNION ALL SELECT user_id, created_at FROM public.qa_answers
      UNION ALL SELECT user_id, created_at FROM public.community_post_comments
    ) t
    WHERE t.created_at >= v_month_start
      AND t.user_id IS NOT NULL
  )
  LOOP
    PERFORM public.recompute_monthly_nominee(r.user_id);
  END LOOP;
END $$;