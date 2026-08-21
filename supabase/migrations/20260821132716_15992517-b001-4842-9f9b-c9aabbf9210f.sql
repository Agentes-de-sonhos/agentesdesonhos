REVOKE ALL ON FUNCTION public.sync_agency_booking_requests(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_agency_booking_requests(uuid) TO service_role;