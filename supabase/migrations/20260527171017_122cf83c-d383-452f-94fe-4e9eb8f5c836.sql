
-- =========================================
-- TABLE: operations
-- =========================================
CREATE TABLE public.operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  quote_id UUID,
  itinerary_id UUID,
  trip_id UUID,
  title TEXT NOT NULL DEFAULT '',
  destination TEXT,
  travel_start_date DATE,
  travel_end_date DATE,
  passengers_count INTEGER NOT NULL DEFAULT 1,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'venda_confirmada',
  priority TEXT NOT NULL DEFAULT 'normal',
  payment_status TEXT NOT NULL DEFAULT 'pendente',
  assigned_user_id UUID,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations TO authenticated;
GRANT ALL ON public.operations TO service_role;

ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own operations" ON public.operations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own operations" ON public.operations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own operations" ON public.operations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own operations" ON public.operations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_operations_user ON public.operations(user_id);
CREATE INDEX idx_operations_stage ON public.operations(user_id, stage);
CREATE INDEX idx_operations_opportunity ON public.operations(opportunity_id);
CREATE INDEX idx_operations_travel_start ON public.operations(user_id, travel_start_date);

CREATE TRIGGER update_operations_updated_at
  BEFORE UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- TABLE: operation_tasks
-- =========================================
CREATE TABLE public.operation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stage TEXT NOT NULL,
  label TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  done_by UUID,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_tasks TO authenticated;
GRANT ALL ON public.operation_tasks TO service_role;

ALTER TABLE public.operation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own operation tasks" ON public.operation_tasks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own operation tasks" ON public.operation_tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own operation tasks" ON public.operation_tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own operation tasks" ON public.operation_tasks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_operation_tasks_op ON public.operation_tasks(operation_id);

CREATE TRIGGER update_operation_tasks_updated_at
  BEFORE UPDATE ON public.operation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- TABLE: operation_timeline
-- =========================================
CREATE TABLE public.operation_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_timeline TO authenticated;
GRANT ALL ON public.operation_timeline TO service_role;

ALTER TABLE public.operation_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own operation timeline" ON public.operation_timeline
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own operation timeline" ON public.operation_timeline
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own operation timeline" ON public.operation_timeline
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own operation timeline" ON public.operation_timeline
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_operation_timeline_op ON public.operation_timeline(operation_id, created_at DESC);

-- =========================================
-- TABLE: operation_attachments
-- =========================================
CREATE TABLE public.operation_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT NOT NULL DEFAULT 'documento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_attachments TO authenticated;
GRANT ALL ON public.operation_attachments TO service_role;

ALTER TABLE public.operation_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own operation attachments" ON public.operation_attachments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own operation attachments" ON public.operation_attachments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own operation attachments" ON public.operation_attachments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own operation attachments" ON public.operation_attachments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_operation_attachments_op ON public.operation_attachments(operation_id);

-- =========================================
-- STORAGE BUCKET: operation-files
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('operation-files', 'operation-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own operation files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'operation-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own operation files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'operation-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own operation files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'operation-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own operation files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'operation-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================
-- TRIGGER: update stage_entered_at + timeline event on stage change
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_operation_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.operation_timeline (operation_id, user_id, event_type, description, metadata)
    VALUES (NEW.id, NEW.user_id, 'operation_created',
            'Operação criada', jsonb_build_object('stage', NEW.stage));
    RETURN NEW;
  END IF;

  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_entered_at := now();
    INSERT INTO public.operation_timeline (operation_id, user_id, event_type, description, metadata)
    VALUES (NEW.id, NEW.user_id, 'stage_changed',
            'Etapa alterada',
            jsonb_build_object('from', OLD.stage, 'to', NEW.stage));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_operation_stage_change
  BEFORE UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.handle_operation_stage_change();

CREATE TRIGGER trg_operation_created
  AFTER INSERT ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.handle_operation_stage_change();

-- =========================================
-- TRIGGER: auto-create operation when opportunity is closed
-- =========================================
CREATE OR REPLACE FUNCTION public.auto_create_operation_on_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record RECORD;
  existing_op_id UUID;
  op_title TEXT;
BEGIN
  IF NEW.stage = 'closed' AND (OLD.stage IS NULL OR OLD.stage <> 'closed') THEN
    -- Avoid duplicate
    SELECT id INTO existing_op_id
    FROM public.operations
    WHERE opportunity_id = NEW.id
    LIMIT 1;

    IF existing_op_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    SELECT name INTO client_record FROM public.clients WHERE id = NEW.client_id;
    op_title := COALESCE(NEW.destination, 'Viagem') || ' - ' || COALESCE(client_record.name, 'Cliente');

    INSERT INTO public.operations (
      user_id, client_id, opportunity_id, title, destination,
      travel_start_date, travel_end_date, passengers_count, sale_amount,
      stage, position
    ) VALUES (
      NEW.user_id, NEW.client_id, NEW.id, op_title, NEW.destination,
      NEW.start_date, NEW.end_date, NEW.passengers_count, NEW.estimated_value,
      'venda_confirmada', 0
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_operation
  AFTER INSERT OR UPDATE OF stage ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_operation_on_close();
