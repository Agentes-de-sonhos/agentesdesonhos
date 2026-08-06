-- 1) Segurança: remove EXECUTE de PUBLIC/anon em team_can_read_team
REVOKE EXECUTE ON FUNCTION public.team_can_read_team(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.team_can_read_team(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.team_can_read_team(uuid) TO authenticated, service_role;

-- 2) KPI: total de agências no mesmo universo de admin_agency_teams_list
CREATE OR REPLACE FUNCTION public.admin_agency_owners_total()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles p
  WHERE p.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.agency_team_members m
      WHERE m.auth_user_id = p.user_id
    );
$$;

REVOKE ALL ON FUNCTION public.admin_agency_owners_total() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_agency_owners_total() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_agency_owners_total() TO service_role;