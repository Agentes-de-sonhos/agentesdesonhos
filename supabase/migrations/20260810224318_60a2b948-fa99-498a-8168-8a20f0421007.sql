-- 1) Calendar timezone cache on the connection (additive, nullable).
ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS calendar_time_zone TEXT,
  ADD COLUMN IF NOT EXISTS calendar_time_zone_checked_at TIMESTAMPTZ;

-- 2) Resolution outcome recorded by the user (additive).
ALTER TABLE public.google_calendar_conflicts
  ADD COLUMN IF NOT EXISTS resolution TEXT;

-- 3) Conflicts: least privilege for the client. Writes belong to the sync.
DROP POLICY IF EXISTS "Users can manage own calendar conflicts" ON public.google_calendar_conflicts;

REVOKE ALL ON public.google_calendar_conflicts FROM authenticated;
GRANT SELECT ON public.google_calendar_conflicts TO authenticated;
GRANT UPDATE (status, resolution, resolved_at, updated_at) ON public.google_calendar_conflicts TO authenticated;
GRANT ALL ON public.google_calendar_conflicts TO service_role;

CREATE POLICY "Users can view own calendar conflicts"
  ON public.google_calendar_conflicts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can resolve own calendar conflicts"
  ON public.google_calendar_conflicts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) Integrity: a conflict can only reference a mapping of the same user.
CREATE OR REPLACE FUNCTION public.google_calendar_conflict_owner_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sync_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.google_calendar_sync s
      WHERE s.id = NEW.sync_id AND s.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'sync_id does not belong to user_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_google_calendar_conflict_owner_guard ON public.google_calendar_conflicts;
CREATE TRIGGER trg_google_calendar_conflict_owner_guard
  BEFORE INSERT OR UPDATE OF sync_id, user_id ON public.google_calendar_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.google_calendar_conflict_owner_guard();

-- 5) Version history: one row per (user, google event, google version, local marker).
CREATE UNIQUE INDEX IF NOT EXISTS google_calendar_conflicts_version_uniq
  ON public.google_calendar_conflicts (
    user_id,
    google_event_id,
    COALESCE(google_etag, ''),
    COALESCE(google_updated, '-infinity'::timestamptz),
    COALESCE(local_updated_at, '-infinity'::timestamptz)
  );