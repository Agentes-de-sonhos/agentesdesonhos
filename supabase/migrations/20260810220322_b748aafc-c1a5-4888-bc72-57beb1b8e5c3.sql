ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS incremental_page_token TEXT,
  ADD COLUMN IF NOT EXISTS incremental_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS incremental_pages_done INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incremental_items_done INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS push_deleted_cursor_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_deleted_cursor_event_id UUID,
  ADD COLUMN IF NOT EXISTS push_deleted_cursor_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.google_calendar_tokens.incremental_page_token IS 'Resumable pageToken for multi-page incremental (syncToken) pulls. Cleared only on the last page or on a real HTTP 410.';
COMMENT ON COLUMN public.google_calendar_tokens.push_deleted_cursor_at IS 'Composite cursor (deleted_at) for resumable local-deletion pushes.';
COMMENT ON COLUMN public.google_calendar_tokens.push_deleted_cursor_event_id IS 'Composite cursor (event id) tiebreaker for resumable local-deletion pushes.';