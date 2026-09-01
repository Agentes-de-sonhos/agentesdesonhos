REVOKE ALL ON FUNCTION public.sync_auto_income_entry_for_product(uuid) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.trg_sync_auto_income_entry() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_auto_income_entry_for_product(uuid) TO service_role;