
CREATE TABLE public.operation_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stage TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Padrão',
  is_default BOOLEAN NOT NULL DEFAULT true,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX operation_checklist_templates_user_stage_default_idx
  ON public.operation_checklist_templates (user_id, stage)
  WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_checklist_templates TO authenticated;
GRANT ALL ON public.operation_checklist_templates TO service_role;

ALTER TABLE public.operation_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own checklist templates"
  ON public.operation_checklist_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own checklist templates"
  ON public.operation_checklist_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own checklist templates"
  ON public.operation_checklist_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own checklist templates"
  ON public.operation_checklist_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_operation_checklist_templates_updated_at
  BEFORE UPDATE ON public.operation_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
