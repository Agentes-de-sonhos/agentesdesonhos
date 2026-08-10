ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS bootstrap_page_token text,
  ADD COLUMN IF NOT EXISTS bootstrap_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS bootstrap_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS bootstrap_pages_done integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bootstrap_items_done integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bootstrap_window_start timestamptz,
  ADD COLUMN IF NOT EXISTS bootstrap_window_end timestamptz,
  ADD COLUMN IF NOT EXISTS bootstrap_last_error text,
  ADD COLUMN IF NOT EXISTS push_cursor_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_cursor_event_id uuid,
  ADD COLUMN IF NOT EXISTS push_cursor_completed_at timestamptz;

COMMENT ON COLUMN public.google_calendar_tokens.bootstrap_page_token IS 'Resumable Google pageToken for the initial bootstrap pull; NULL when no bootstrap page is pending.';
COMMENT ON COLUMN public.google_calendar_tokens.bootstrap_completed_at IS 'Set only after the whole bootstrap pagination finished and nextSyncToken was persisted.';
COMMENT ON COLUMN public.google_calendar_tokens.push_cursor_updated_at IS 'Composite cursor (updated_at, event_id) for incremental local push scanning.';