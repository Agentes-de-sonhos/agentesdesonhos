CREATE TABLE public.operation_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_quote_service_id uuid,
  service_type text NOT NULL DEFAULT 'other',
  name text NOT NULL DEFAULT 'Serviço',
  supplier text,
  destination text,
  start_date date,
  end_date date,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  service_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_confirmed boolean NOT NULL DEFAULT false,
  is_paid boolean NOT NULL DEFAULT false,
  is_issued boolean NOT NULL DEFAULT false,
  is_delivered boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by_team_member_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_operation_services_operation ON public.operation_services(operation_id);
CREATE INDEX idx_operation_services_user ON public.operation_services(user_id);
CREATE UNIQUE INDEX uq_operation_services_source ON public.operation_services(operation_id, source_quote_service_id) WHERE source_quote_service_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_services TO authenticated;
GRANT ALL ON public.operation_services TO service_role;

ALTER TABLE public.operation_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_full_access" ON public.operation_services
FOR ALL TO authenticated
USING (is_agency_member(user_id))
WITH CHECK (is_agency_member(user_id));

CREATE POLICY "team_op_services_select" ON public.operation_services
FOR SELECT TO authenticated
USING (can_team('operations.view'));

CREATE POLICY "team_op_services_insert" ON public.operation_services
FOR INSERT TO authenticated
WITH CHECK (can_team('operations.edit') AND user_id = user_agency_id(auth.uid()));

CREATE POLICY "team_op_services_update" ON public.operation_services
FOR UPDATE TO authenticated
USING (can_team('operations.edit'))
WITH CHECK (user_id = user_agency_id(auth.uid()));

CREATE POLICY "team_op_services_delete" ON public.operation_services
FOR DELETE TO authenticated
USING (can_team('operations.delete'));

CREATE TRIGGER update_operation_services_updated_at
BEFORE UPDATE ON public.operation_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.auto_create_operation_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
  existing_op_id UUID;
  op_title TEXT;
  new_legacy TEXT;
  old_legacy TEXT;
  is_now_closed BOOLEAN := false;
  was_closed BOOLEAN := false;
BEGIN
  IF NEW.stage_id IS NOT NULL THEN
    SELECT legacy_key INTO new_legacy FROM public.pipeline_stages WHERE id = NEW.stage_id;
  END IF;
  new_legacy := COALESCE(new_legacy, NEW.stage);

  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS NOT NULL THEN
      SELECT legacy_key INTO old_legacy FROM public.pipeline_stages WHERE id = OLD.stage_id;
    END IF;
    old_legacy := COALESCE(old_legacy, OLD.stage);
    was_closed := (old_legacy = 'closed');
  END IF;

  is_now_closed := (new_legacy = 'closed');

  IF is_now_closed AND NOT was_closed THEN
    SELECT id INTO existing_op_id FROM public.operations WHERE opportunity_id = NEW.id LIMIT 1;
    IF existing_op_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    SELECT name INTO client_record FROM public.clients WHERE id = NEW.client_id;
    op_title := COALESCE(NEW.destination, 'Viagem') || ' - ' || COALESCE(client_record.name, 'Cliente');

    INSERT INTO public.operations (
      user_id, client_id, opportunity_id, title, destination,
      travel_start_date, travel_end_date, passengers_count, sale_amount,
      stage, payment_status, position
    ) VALUES (
      NEW.user_id, NEW.client_id, NEW.id, op_title, NEW.destination,
      NEW.start_date, NEW.end_date, NEW.passengers_count, NEW.estimated_value,
      'venda_confirmada', 'pendente', 0
    );
  END IF;

  RETURN NEW;
END;
$function$;