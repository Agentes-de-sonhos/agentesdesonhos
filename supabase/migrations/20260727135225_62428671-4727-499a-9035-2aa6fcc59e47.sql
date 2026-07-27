
-- =====================================================================
-- 1) Uniqueness + no-self-vote guard on community_monthly_votes
-- =====================================================================
ALTER TABLE public.community_monthly_votes
  DROP CONSTRAINT IF EXISTS community_monthly_votes_award_voter_unique;
ALTER TABLE public.community_monthly_votes
  ADD CONSTRAINT community_monthly_votes_award_voter_unique
  UNIQUE (award_id, voter_user_id);

ALTER TABLE public.community_monthly_votes
  DROP CONSTRAINT IF EXISTS community_monthly_votes_no_self;
ALTER TABLE public.community_monthly_votes
  ADD CONSTRAINT community_monthly_votes_no_self
  CHECK (voter_user_id <> nominee_user_id);

-- =====================================================================
-- 2) RPC: cast / change vote
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cast_monthly_vote(_nominee_user_id uuid)
RETURNS public.community_monthly_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voter uuid := auth.uid();
  v_award public.community_monthly_awards;
  v_now timestamptz := now();
  v_nominee public.community_monthly_nominees;
  v_vote public.community_monthly_votes;
  v_voter_is_agent boolean;
BEGIN
  IF v_voter IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF _nominee_user_id IS NULL THEN
    RAISE EXCEPTION 'nominee_required' USING ERRCODE = '22023';
  END IF;

  IF _nominee_user_id = v_voter THEN
    RAISE EXCEPTION 'cannot_vote_for_self' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = v_voter AND role = 'agente'
  ) INTO v_voter_is_agent;

  IF NOT v_voter_is_agent THEN
    RAISE EXCEPTION 'voter_not_agent' USING ERRCODE = '42501';
  END IF;

  v_award := public.get_current_month_award();

  IF v_award.voting_start_at IS NULL OR v_award.voting_end_at IS NULL
     OR v_now < v_award.voting_start_at
     OR v_now > v_award.voting_end_at THEN
    RAISE EXCEPTION 'voting_closed' USING ERRCODE = '22023';
  END IF;

  IF v_award.status IN ('completed','cancelled','calculating') THEN
    RAISE EXCEPTION 'voting_closed' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_nominee
    FROM public.community_monthly_nominees
   WHERE award_id = v_award.id AND user_id = _nominee_user_id;

  IF NOT FOUND OR NOT v_nominee.eligible THEN
    RAISE EXCEPTION 'nominee_not_eligible' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.community_monthly_votes(award_id, voter_user_id, nominee_user_id)
  VALUES (v_award.id, v_voter, _nominee_user_id)
  ON CONFLICT (award_id, voter_user_id)
  DO UPDATE SET nominee_user_id = EXCLUDED.nominee_user_id,
                updated_at = now()
  RETURNING * INTO v_vote;

  RETURN v_vote;
END $$;

REVOKE ALL ON FUNCTION public.cast_monthly_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_monthly_vote(uuid) TO authenticated;

-- =====================================================================
-- 3) RPC: get my own vote for current award
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_my_monthly_vote()
RETURNS TABLE(award_id uuid, nominee_user_id uuid, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voter uuid := auth.uid();
  v_award public.community_monthly_awards;
BEGIN
  IF v_voter IS NULL THEN
    RETURN;
  END IF;
  v_award := public.get_current_month_award();
  RETURN QUERY
    SELECT v.award_id, v.nominee_user_id, v.created_at, v.updated_at
      FROM public.community_monthly_votes v
     WHERE v.award_id = v_award.id AND v.voter_user_id = v_voter;
END $$;

REVOKE ALL ON FUNCTION public.get_my_monthly_vote() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_monthly_vote() TO authenticated;

-- =====================================================================
-- 4) Trigger: recompute nominee eligibility when user_roles changes
-- =====================================================================
CREATE OR REPLACE FUNCTION public.on_user_roles_change_recompute_nominee()
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
    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM public.recompute_monthly_nominee(OLD.user_id);
    END IF;
    RETURN NEW;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_user_roles_recompute_nominee ON public.user_roles;
CREATE TRIGGER trg_user_roles_recompute_nominee
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.on_user_roles_change_recompute_nominee();
