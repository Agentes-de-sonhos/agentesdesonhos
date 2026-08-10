-- 1) Transactional, service_role-only purge of local Google copies.
-- No id list ever crosses the application boundary (no 1000-row API cap) and
-- everything happens in one transaction, so orphan copies are impossible.
CREATE OR REPLACE FUNCTION public.purge_google_calendar_local_copies(p_user_id uuid)
RETURNS TABLE (deleted_conflicts integer, deleted_events integer, deleted_mappings integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflicts integer := 0;
  v_events integer := 0;
  v_mappings integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  DELETE FROM public.google_calendar_conflicts c
   WHERE c.user_id = p_user_id;
  GET DIAGNOSTICS v_conflicts = ROW_COUNT;

  -- Events imported FROM Google only (origin = 'google'), for this user only.
  -- notes.event_id is ON DELETE SET NULL and google_calendar_sync.agency_event_id
  -- is ON DELETE CASCADE, so mappings of deleted events disappear with them.
  DELETE FROM public.agency_events e
   USING public.google_calendar_sync s
   WHERE s.agency_event_id = e.id
     AND s.user_id = p_user_id
     AND s.origin = 'google'
     AND e.user_id = p_user_id;
  GET DIAGNOSTICS v_events = ROW_COUNT;

  DELETE FROM public.google_calendar_sync s
   WHERE s.user_id = p_user_id;
  GET DIAGNOSTICS v_mappings = ROW_COUNT;

  RETURN QUERY SELECT v_conflicts, v_events, v_mappings;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_google_calendar_local_copies(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_google_calendar_local_copies(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.purge_google_calendar_local_copies(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_google_calendar_local_copies(uuid) TO service_role;

COMMENT ON FUNCTION public.purge_google_calendar_local_copies(uuid) IS
  'Service-role only. Atomically removes the user Google Calendar conflicts, the agency_events imported from Google (origin=google) and the remaining sync mappings. Never touches remote Google events.';

-- 2) Documented backfill of legacy scope metadata.
-- Every connection created before the scope reduction was authorized through
-- code that requested EXCLUSIVELY the broad https://www.googleapis.com/auth/calendar
-- scope. Recording it keeps the admin view truthful; version 1 marks the grant
-- as pending a voluntary downgrade. No reconnection is forced.
UPDATE public.google_calendar_tokens
   SET granted_scopes = 'https://www.googleapis.com/auth/calendar',
       oauth_scope_version = 1,
       scopes_checked_at = COALESCE(scopes_checked_at, now())
 WHERE granted_scopes IS NULL
   AND COALESCE(oauth_scope_version, 0) = 0;