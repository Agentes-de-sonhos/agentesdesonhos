
CREATE TABLE public.highlighted_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_source text NOT NULL DEFAULT 'agency',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.highlighted_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own highlighted events"
  ON public.highlighted_events
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
