CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total INT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'active')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status <> 'active') THEN
    SELECT COUNT(*) INTO total
    FROM public.agency_team_members
    WHERE agency_id = NEW.agency_id AND status = 'active' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF total >= 3 THEN
      RAISE EXCEPTION 'Limite de 3 usuários ativos por agência atingido'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.team_member_quota()
RETURNS TABLE (used INT, total INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int, 3 FROM public.agency_team_members
  WHERE agency_id = auth.uid() AND status = 'active';
$$;