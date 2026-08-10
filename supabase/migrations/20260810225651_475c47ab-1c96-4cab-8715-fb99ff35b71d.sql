-- 1) Conflicts: remove anon entirely; authenticated keeps SELECT + column-scoped UPDATE.
REVOKE ALL ON public.google_calendar_conflicts FROM anon;
REVOKE ALL ON public.google_calendar_conflicts FROM authenticated;
GRANT SELECT ON public.google_calendar_conflicts TO authenticated;
GRANT UPDATE (status, resolution, resolved_at, updated_at) ON public.google_calendar_conflicts TO authenticated;
GRANT ALL ON public.google_calendar_conflicts TO service_role;

-- 2) Sync mappings: internal table, no anonymous access.
REVOKE ALL ON public.google_calendar_sync FROM anon;
GRANT ALL ON public.google_calendar_sync TO service_role;

-- 3) Tokens: allow encrypted-only rows (no readable copy).
ALTER TABLE public.google_calendar_tokens ALTER COLUMN access_token DROP NOT NULL;
ALTER TABLE public.google_calendar_tokens ALTER COLUMN refresh_token DROP NOT NULL;

-- 4) Granted OAuth scopes recorded per connection (additive, nullable).
ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS granted_scopes text,
  ADD COLUMN IF NOT EXISTS scopes_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS oauth_scope_version integer NOT NULL DEFAULT 0;

GRANT ALL ON public.google_calendar_tokens TO service_role;