
CREATE TABLE public.opportunity_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  follow_up_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opportunity_followups_opp ON public.opportunity_followups(opportunity_id);
CREATE INDEX idx_opportunity_followups_user_date ON public.opportunity_followups(user_id, follow_up_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_followups TO authenticated;
GRANT ALL ON public.opportunity_followups TO service_role;

ALTER TABLE public.opportunity_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own followups"
ON public.opportunity_followups
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_opportunity_followups_updated_at
BEFORE UPDATE ON public.opportunity_followups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
