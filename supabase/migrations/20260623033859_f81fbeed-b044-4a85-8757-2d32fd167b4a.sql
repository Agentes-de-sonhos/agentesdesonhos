ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS sync_in_progress boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_lock_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_sync_status text NULL,
  ADD COLUMN IF NOT EXISTS last_sync_error text NULL,
  ADD COLUMN IF NOT EXISTS last_sync_duration_ms integer NULL,
  ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT true;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;