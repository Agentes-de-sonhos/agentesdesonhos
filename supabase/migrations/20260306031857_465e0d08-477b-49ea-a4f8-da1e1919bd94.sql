
-- Table to track daily menu/section visits for gamification
CREATE TABLE public.gamification_daily_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  section_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, visit_date, section_key)
);

ALTER TABLE public.gamification_daily_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own visits"
  ON public.gamification_daily_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own visits"
  ON public.gamification_daily_visits FOR SELECT
  USING (auth.uid() = user_id);
