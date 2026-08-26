REVOKE EXECUTE ON FUNCTION public.log_travel_file_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_travel_file_service_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.travel_file_notes_touch() FROM PUBLIC, anon, authenticated;