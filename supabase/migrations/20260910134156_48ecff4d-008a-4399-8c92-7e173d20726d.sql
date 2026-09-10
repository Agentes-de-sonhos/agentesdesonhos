GRANT EXECUTE ON FUNCTION private.reservations_amount(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reservations_currency(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reservations_check_dates(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reservations_count(jsonb, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reservations_supplier_allowed(uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reservations_redact(jsonb, boolean, boolean, boolean) TO authenticated, service_role;