
CREATE TABLE public.travel_requirements_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID,
  passenger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  trip_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  confidence_score NUMERIC,
  model_used TEXT,
  consulted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trc_user ON public.travel_requirements_consultations(user_id);
CREATE INDEX idx_trc_consulted_at ON public.travel_requirements_consultations(consulted_at DESC);

ALTER TABLE public.travel_requirements_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consultations" ON public.travel_requirements_consultations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own consultations" ON public.travel_requirements_consultations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own consultations" ON public.travel_requirements_consultations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own consultations" ON public.travel_requirements_consultations
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_trc_updated_at
  BEFORE UPDATE ON public.travel_requirements_consultations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
