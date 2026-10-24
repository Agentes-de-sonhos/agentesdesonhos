CREATE TABLE public.agent_feature_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  survey_key text NOT NULL DEFAULT 'feature_usage_2026_10',
  selected_features text[] NOT NULL DEFAULT '{}',
  suggestion text,
  completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_feature_survey_responses TO authenticated;
GRANT ALL ON public.agent_feature_survey_responses TO service_role;
ALTER TABLE public.agent_feature_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own survey read" ON public.agent_feature_survey_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own survey insert" ON public.agent_feature_survey_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND char_length(coalesce(suggestion,'')) <= 1000);