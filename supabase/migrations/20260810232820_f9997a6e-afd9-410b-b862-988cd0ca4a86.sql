-- Fix the reported counter: mappings removed by CASCADE (when the imported
-- agency_events rows are deleted) were previously invisible to the caller,
-- because the final DELETE only saw the leftovers. Count the full original set
-- up front, inside the same transaction. Behaviour is otherwise unchanged.
CREATE OR REPLACE FUNCTION public.purge_google_calendar_local_copies(p_user_id uuid)
RETURNS TABLE (deleted_conflicts integer, deleted_events integer, deleted_mappings integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflicts integer := 0;
  v_events integer := 0;
  v_mappings_total integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Snapshot the original mapping count before any delete runs, so CASCADE
  -- removals are included in the reported total.
  SELECT count(*) INTO v_mappings_total
    FROM public.google_calendar_sync s
   WHERE s.user_id = p_user_id;

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

  -- Remove whatever mapping rows survived the cascade.
  DELETE FROM public.google_calendar_sync s
   WHERE s.user_id = p_user_id;

  RETURN QUERY SELECT v_conflicts, v_events, v_mappings_total;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_google_calendar_local_copies(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_google_calendar_local_copies(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.purge_google_calendar_local_copies(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_google_calendar_local_copies(uuid) TO service_role;

COMMENT ON FUNCTION public.purge_google_calendar_local_copies(uuid) IS
  'Service-role only. Atomically removes the user Google Calendar conflicts, the agency_events imported from Google (origin=google) and every sync mapping. deleted_mappings reports the original total, including rows removed by CASCADE. Never touches remote Google events.';