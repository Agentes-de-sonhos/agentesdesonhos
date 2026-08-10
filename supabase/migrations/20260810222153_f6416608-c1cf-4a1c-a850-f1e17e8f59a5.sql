-- ============================================================
-- Block 3: fidelity, conflicts and safe deletions (additive only)
-- ============================================================

-- 1. google_calendar_sync: Google-side metadata + conflict markers
ALTER TABLE public.google_calendar_sync
  ADD COLUMN IF NOT EXISTS google_etag TEXT,
  ADD COLUMN IF NOT EXISTS google_updated TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS recurring_event_id TEXT,
  ADD COLUMN IF NOT EXISTS original_start_time TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS is_google_managed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS provider_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS local_updated_at_at_sync TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS conflict_state TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS conflict_at TIMESTAMP WITH TIME ZONE;

-- 2. agency_events: optional fidelity fields (all nullable / safe defaults)
ALTER TABLE public.agency_events
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS end_time TIME WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS time_zone TEXT,
  ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS conference_url TEXT,
  ADD COLUMN IF NOT EXISTS attendees JSONB,
  ADD COLUMN IF NOT EXISTS reminders JSONB,
  ADD COLUMN IF NOT EXISTS organizer JSONB,
  ADD COLUMN IF NOT EXISTS recurrence JSONB,
  ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT;

-- 3. Conservative backfill: legacy mappings of unproven provenance are treated
-- as coming from Google and read-only for REMOTE DELETION purposes, so the
-- platform can never delete somebody's Google event by mistake. No row is
-- removed and no existing value is overwritten.
UPDATE public.google_calendar_sync
SET origin = 'google',
    is_read_only = true
WHERE origin IS NULL;

-- Keep the column nullable but make the intent explicit for future rows.
ALTER TABLE public.google_calendar_sync
  ALTER COLUMN origin SET DEFAULT 'google';

-- 4. Conflict ledger (per user / per mapping)
CREATE TABLE IF NOT EXISTS public.google_calendar_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sync_id UUID REFERENCES public.google_calendar_sync(id) ON DELETE CASCADE,
  agency_event_id UUID,
  google_event_id TEXT,
  conflict_type TEXT NOT NULL DEFAULT 'both_changed',
  status TEXT NOT NULL DEFAULT 'open',
  local_snapshot JSONB,
  google_snapshot JSONB,
  google_etag TEXT,
  google_updated TIMESTAMP WITH TIME ZONE,
  local_updated_at TIMESTAMP WITH TIME ZONE,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_conflicts TO authenticated;
GRANT ALL ON public.google_calendar_conflicts TO service_role;

ALTER TABLE public.google_calendar_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar conflicts"
ON public.google_calendar_conflicts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_google_calendar_conflicts_updated_at
BEFORE UPDATE ON public.google_calendar_conflicts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Indexes for the conflict/diagnostic queries and the dedup rule
CREATE INDEX IF NOT EXISTS idx_gcal_conflicts_user_status
  ON public.google_calendar_conflicts (user_id, status, detected_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gcal_conflicts_open_version
  ON public.google_calendar_conflicts (user_id, google_event_id, coalesce(google_etag, ''), coalesce(local_updated_at, 'epoch'::timestamptz))
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_gcal_sync_conflict_state
  ON public.google_calendar_sync (user_id, conflict_state)
  WHERE conflict_state <> 'none';