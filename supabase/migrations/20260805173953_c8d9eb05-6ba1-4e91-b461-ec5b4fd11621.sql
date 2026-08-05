CREATE OR REPLACE FUNCTION public.team_max_members(_agency_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _max int; _plan public.subscription_plan;
BEGIN
  SELECT o.max_members INTO _max FROM public.agency_team_limit_overrides o WHERE o.agency_id = _agency_id;
  IF _max IS NOT NULL THEN RETURN _max; END IF;
  _plan := public.get_user_plan(_agency_id);
  SELECT l.max_members INTO _max FROM public.plan_team_limits l WHERE l.plan = _plan;
  RETURN COALESCE(_max, 3);
END $$;
REVOKE EXECUTE ON FUNCTION public.team_max_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_max_members(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total INT; allowed INT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('active','blocked'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('active','blocked') AND OLD.status NOT IN ('active','blocked')) THEN
    allowed := public.team_max_members(NEW.agency_id);
    SELECT COUNT(*) INTO total
    FROM public.agency_team_members
    WHERE agency_id = NEW.agency_id
      AND status IN ('active','blocked')
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF total >= allowed THEN
      RAISE EXCEPTION 'Limite de % usuário(s) da equipe atingido no seu plano.', allowed
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;