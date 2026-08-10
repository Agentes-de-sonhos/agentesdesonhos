REVOKE EXECUTE ON FUNCTION public.effective_subscription() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_team_accounts_overview() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.team_orphan_members() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.effective_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_team_accounts_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_orphan_members() TO authenticated;