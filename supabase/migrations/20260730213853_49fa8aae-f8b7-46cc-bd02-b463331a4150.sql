REVOKE EXECUTE ON FUNCTION public.recalc_product_landing_counters(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_product_landing_counters(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mark_product_landing_test_events(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_product_landing_test_mode(uuid, int) FROM PUBLIC, anon;