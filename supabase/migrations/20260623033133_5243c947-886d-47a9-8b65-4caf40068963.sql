ALTER TABLE public.agency_events
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_sync boolean NOT NULL DEFAULT false;

ALTER TABLE public.google_calendar_sync
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_agency_events_user_active
  ON public.agency_events(user_id, event_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_deleted
  ON public.google_calendar_sync(user_id, deleted_at);