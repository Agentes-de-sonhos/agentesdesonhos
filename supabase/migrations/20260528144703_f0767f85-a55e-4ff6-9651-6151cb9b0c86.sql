
-- ============ OPERATION PIPELINE STAGES ============
CREATE TABLE public.operation_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  position INTEGER NOT NULL DEFAULT 0,
  legacy_key TEXT,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_pipeline_stages TO authenticated;
GRANT ALL ON public.operation_pipeline_stages TO service_role;

ALTER TABLE public.operation_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_stages_select_own" ON public.operation_pipeline_stages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ops_stages_insert_own" ON public.operation_pipeline_stages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ops_stages_update_own" ON public.operation_pipeline_stages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ops_stages_delete_own" ON public.operation_pipeline_stages
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_protected = false);

CREATE INDEX idx_op_stages_user_pos ON public.operation_pipeline_stages(user_id, position);

CREATE TRIGGER trg_op_stages_updated_at
  BEFORE UPDATE ON public.operation_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ OPERATION LABELS ============
CREATE TABLE public.operation_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_labels TO authenticated;
GRANT ALL ON public.operation_labels TO service_role;

ALTER TABLE public.operation_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_labels_select_own" ON public.operation_labels
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "op_labels_insert_own" ON public.operation_labels
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "op_labels_update_own" ON public.operation_labels
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "op_labels_delete_own" ON public.operation_labels
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_op_labels_updated_at
  BEFORE UPDATE ON public.operation_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ OPERATION LABEL ASSIGNMENTS ============
CREATE TABLE public.operation_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.operation_labels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operation_id, label_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_label_assignments TO authenticated;
GRANT ALL ON public.operation_label_assignments TO service_role;

ALTER TABLE public.operation_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_label_assign_select_own" ON public.operation_label_assignments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "op_label_assign_insert_own" ON public.operation_label_assignments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "op_label_assign_delete_own" ON public.operation_label_assignments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_op_label_assign_op ON public.operation_label_assignments(operation_id);
CREATE INDEX idx_op_label_assign_user ON public.operation_label_assignments(user_id);

-- ============ SEED DEFAULT STAGES FUNCTION ============
CREATE OR REPLACE FUNCTION public.ensure_default_operation_stages(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.operation_pipeline_stages WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.operation_pipeline_stages (user_id, key, name, color, position, legacy_key, is_protected) VALUES
    (_user_id, 'venda_confirmada', 'Pagamento Confirmado', 'emerald', 0, 'venda_confirmada', true),
    (_user_id, 'emissao',          'Emissão / Reservas',  'blue',    1, 'emissao', false),
    (_user_id, 'documentacao',     'Documentação',        'amber',   2, 'documentacao', false),
    (_user_id, 'entrega',          'Entrega da Viagem',   'violet',  3, 'entrega', false),
    (_user_id, 'pre_embarque',     'Pré-Embarque',        'orange',  4, 'pre_embarque', false),
    (_user_id, 'em_viagem',        'Em Viagem',           'sky',     5, 'em_viagem', false),
    (_user_id, 'pos_viagem',       'Pós-Viagem',          'fuchsia', 6, 'pos_viagem', false),
    (_user_id, 'finalizado',       'Finalizado',          'slate',   7, 'finalizado', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_default_operation_stages(UUID) TO authenticated;
