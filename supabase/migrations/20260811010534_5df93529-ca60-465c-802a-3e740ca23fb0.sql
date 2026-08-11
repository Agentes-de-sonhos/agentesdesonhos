CREATE TABLE IF NOT EXISTS public.google_calendar_purge_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  titles text[] NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  phase text NOT NULL DEFAULT 'mappings',
  mapping_cursor text,
  scan_page_token text,
  scan_window_start timestamptz,
  scan_window_end timestamptz,
  removed_count integer NOT NULL DEFAULT 0,
  already_gone_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  scanned_count integer NOT NULL DEFAULT 0,
  mappings_marked integer NOT NULL DEFAULT 0,
  runs_count integer NOT NULL DEFAULT 0,
  error_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_at timestamptz,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.google_calendar_purge_jobs TO service_role;
GRANT SELECT ON public.google_calendar_purge_jobs TO authenticated;

ALTER TABLE public.google_calendar_purge_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view purge jobs" ON public.google_calendar_purge_jobs;
CREATE POLICY "Admins can view purge jobs"
  ON public.google_calendar_purge_jobs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_google_calendar_purge_jobs_updated_at ON public.google_calendar_purge_jobs;
CREATE TRIGGER update_google_calendar_purge_jobs_updated_at
  BEFORE UPDATE ON public.google_calendar_purge_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS google_calendar_purge_jobs_status_idx
  ON public.google_calendar_purge_jobs (status);

-- Idempotency: one active mapping per (account, calendar, remote event).
CREATE UNIQUE INDEX IF NOT EXISTS google_calendar_sync_provider_identity_uidx
  ON public.google_calendar_sync (user_id, google_calendar_id, google_event_id)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.google_calendar_purge_claim(p_job uuid, p_stale_seconds integer DEFAULT 300)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed integer;
BEGIN
  UPDATE public.google_calendar_purge_jobs
     SET locked_at = now(),
         status = 'running',
         runs_count = runs_count + 1,
         last_run_at = now(),
         updated_at = now()
   WHERE id = p_job
     AND status IN ('pending', 'running')
     AND (locked_at IS NULL OR locked_at < now() - make_interval(secs => p_stale_seconds));
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.google_calendar_purge_release(p_job uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.google_calendar_purge_jobs
     SET locked_at = NULL, updated_at = now()
   WHERE id = p_job;
$$;

CREATE OR REPLACE FUNCTION public.google_calendar_purge_next_targets(p_job uuid, p_limit integer DEFAULT 40)
RETURNS TABLE(target text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_titles text[];
  v_cursor text;
BEGIN
  SELECT j.user_id, j.titles, j.mapping_cursor
    INTO v_user, v_titles, v_cursor
    FROM public.google_calendar_purge_jobs j
   WHERE j.id = p_job;
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT COALESCE(s.recurring_event_id, s.google_event_id) AS target
    FROM public.google_calendar_sync s
    JOIN public.agency_events e ON e.id = s.agency_event_id
   WHERE s.user_id = v_user
     AND s.deleted_at IS NULL
     AND e.title = ANY(v_titles)
     AND COALESCE(s.recurring_event_id, s.google_event_id) IS NOT NULL
     AND (v_cursor IS NULL OR COALESCE(s.recurring_event_id, s.google_event_id) > v_cursor)
   ORDER BY 1
   LIMIT GREATEST(p_limit, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.google_calendar_purge_mark_target(p_user uuid, p_titles text[], p_target text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.google_calendar_sync s
     SET deleted_at = now()
   WHERE s.user_id = p_user
     AND s.deleted_at IS NULL
     AND COALESCE(s.recurring_event_id, s.google_event_id) = p_target
     AND EXISTS (
       SELECT 1 FROM public.agency_events e
        WHERE e.id = s.agency_event_id
          AND e.title = ANY(p_titles)
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.google_calendar_purge_claim(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.google_calendar_purge_release(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.google_calendar_purge_next_targets(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.google_calendar_purge_mark_target(uuid, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.google_calendar_purge_claim(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.google_calendar_purge_release(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.google_calendar_purge_next_targets(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.google_calendar_purge_mark_target(uuid, text[], text) TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_google_calendar_purge()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_secret text;
  v_request_id bigint;
  v_pending integer;
BEGIN
  SELECT count(*) INTO v_pending
    FROM public.google_calendar_purge_jobs
   WHERE status IN ('pending', 'running');
  IF v_pending = 0 THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'calendar_cron_secret'
   LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE NOTICE 'calendar_cron_secret missing in vault; purge trigger skipped';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://mlwwpckahhfsixplxwif.supabase.co/functions/v1/google-calendar-purge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := jsonb_build_object('action', 'run', 'invoked_at', now())
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_google_calendar_purge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_google_calendar_purge() TO service_role;