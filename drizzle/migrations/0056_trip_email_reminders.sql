CREATE TABLE public.trip_email_reminder_settings (
  user_id uuid PRIMARY KEY,
  departure_days smallint NOT NULL DEFAULT 1 CHECK (departure_days BETWEEN 0 AND 3),
  return_days smallint NOT NULL DEFAULT 1 CHECK (return_days BETWEEN 0 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.trip_email_reminder_settings TO authenticated;
GRANT ALL ON public.trip_email_reminder_settings TO service_role;
ALTER TABLE public.trip_email_reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reminder settings select" ON public.trip_email_reminder_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own reminder settings insert" ON public.trip_email_reminder_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own reminder settings update" ON public.trip_email_reminder_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.trip_email_reminder_log (
  trip_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('departure','return')),
  target_date date NOT NULL,
  user_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, kind, target_date)
);
GRANT ALL ON public.trip_email_reminder_log TO service_role;
ALTER TABLE public.trip_email_reminder_log ENABLE ROW LEVEL SECURITY;