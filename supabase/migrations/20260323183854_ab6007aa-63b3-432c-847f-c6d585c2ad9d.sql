
-- Table to store Google OAuth tokens per user
CREATE TABLE public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  calendar_id text DEFAULT 'primary',
  sync_enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens"
  ON public.google_calendar_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table to track sync mapping between local and Google events
CREATE TABLE public.google_calendar_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agency_event_id uuid REFERENCES public.agency_events(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  last_synced_at timestamptz DEFAULT now(),
  sync_direction text DEFAULT 'bidirectional',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, google_event_id),
  UNIQUE(user_id, agency_event_id)
);

ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sync records"
  ON public.google_calendar_sync
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
