REVOKE ALL ON FUNCTION public.import_booking_request_into_operation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_booking_request_into_operation(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_booking_request_into_operation(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.trg_import_booking_request_services() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_import_booking_request_services() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_request_negotiation_stage(uuid) FROM anon, authenticated;