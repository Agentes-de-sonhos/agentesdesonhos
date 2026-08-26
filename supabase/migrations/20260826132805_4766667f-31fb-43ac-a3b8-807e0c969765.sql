-- ============================================================
-- Central de Reservas (Etapa 3): notas internas + histórico
-- ============================================================

CREATE TABLE IF NOT EXISTS public.travel_file_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.travel_files(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  author_user_id uuid,
  author_team_member_id uuid,
  author_name text,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS travel_file_notes_file_idx
  ON public.travel_file_notes (file_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_file_notes TO authenticated;
GRANT ALL ON public.travel_file_notes TO service_role;

ALTER TABLE public.travel_file_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_view_file_notes"
  ON public.travel_file_notes FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "agency_members_insert_file_notes"
  ON public.travel_file_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(agency_id) AND author_user_id = auth.uid());

CREATE POLICY "authors_update_file_notes"
  ON public.travel_file_notes FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() AND public.is_agency_member(agency_id))
  WITH CHECK (author_user_id = auth.uid() AND public.is_agency_member(agency_id));

CREATE POLICY "authors_delete_file_notes"
  ON public.travel_file_notes FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() AND public.is_agency_member(agency_id));

CREATE OR REPLACE FUNCTION public.travel_file_notes_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_travel_file_notes_touch ON public.travel_file_notes;
CREATE TRIGGER trg_travel_file_notes_touch
  BEFORE UPDATE ON public.travel_file_notes
  FOR EACH ROW EXECUTE FUNCTION public.travel_file_notes_touch();

-- ------------------------------------------------------------
-- Histórico operacional do file (append-only em eventos)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_travel_file_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request uuid;
  v_member uuid;
BEGIN
  v_request := COALESCE(NEW.current_request_id, NEW.root_request_id);
  IF v_request IS NULL THEN RETURN NEW; END IF;

  SELECT tm.id INTO v_member
  FROM public.agency_team_members tm
  WHERE tm.auth_user_id = auth.uid()
  LIMIT 1;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.quote_booking_request_events
      (request_id, actor_type, actor_user_id, actor_team_member_id, event_type, payload)
    VALUES (
      v_request, 'agency', auth.uid(), v_member, 'file_status_changed',
      jsonb_build_object(
        'file_id', NEW.id,
        'from', OLD.status,
        'to', NEW.status,
        'reason', NEW.cancellation_reason
      )
    );
  END IF;

  IF NEW.responsible_team_member_id IS DISTINCT FROM OLD.responsible_team_member_id THEN
    INSERT INTO public.quote_booking_request_events
      (request_id, actor_type, actor_user_id, actor_team_member_id, event_type, payload)
    VALUES (
      v_request, 'agency', auth.uid(), v_member, 'file_responsible_changed',
      jsonb_build_object('file_id', NEW.id, 'from', OLD.responsible_team_member_id, 'to', NEW.responsible_team_member_id)
    );
  END IF;

  IF NEW.operations_responsible_team_member_id IS DISTINCT FROM OLD.operations_responsible_team_member_id THEN
    INSERT INTO public.quote_booking_request_events
      (request_id, actor_type, actor_user_id, actor_team_member_id, event_type, payload)
    VALUES (
      v_request, 'agency', auth.uid(), v_member, 'file_operations_responsible_changed',
      jsonb_build_object('file_id', NEW.id, 'from', OLD.operations_responsible_team_member_id, 'to', NEW.operations_responsible_team_member_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_travel_file_change ON public.travel_files;
CREATE TRIGGER trg_log_travel_file_change
  AFTER UPDATE ON public.travel_files
  FOR EACH ROW EXECUTE FUNCTION public.log_travel_file_change();

CREATE OR REPLACE FUNCTION public.log_travel_file_service_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request uuid;
  v_member uuid;
BEGIN
  SELECT COALESCE(f.current_request_id, f.root_request_id) INTO v_request
  FROM public.travel_files f WHERE f.id = NEW.file_id;
  IF v_request IS NULL THEN RETURN NEW; END IF;

  SELECT tm.id INTO v_member
  FROM public.agency_team_members tm
  WHERE tm.auth_user_id = auth.uid()
  LIMIT 1;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.quote_booking_request_events
      (request_id, item_id, actor_type, actor_user_id, actor_team_member_id, event_type, payload)
    VALUES (
      v_request, NEW.request_item_id, 'agency', auth.uid(), v_member, 'service_status_changed',
      jsonb_build_object(
        'file_id', NEW.file_id, 'service_id', NEW.id, 'service_name', NEW.product_name,
        'from', OLD.status, 'to', NEW.status
      )
    );
  END IF;

  IF NEW.reconfirmed_amount IS DISTINCT FROM OLD.reconfirmed_amount
     OR NEW.sold_amount IS DISTINCT FROM OLD.sold_amount
     OR NEW.cost_amount IS DISTINCT FROM OLD.cost_amount
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount THEN
    INSERT INTO public.quote_booking_request_events
      (request_id, item_id, actor_type, actor_user_id, actor_team_member_id, event_type, payload)
    VALUES (
      v_request, NEW.request_item_id, 'agency', auth.uid(), v_member, 'service_amounts_changed',
      jsonb_build_object(
        'file_id', NEW.file_id, 'service_id', NEW.id, 'service_name', NEW.product_name,
        'currency', NEW.currency,
        'reconfirmed_from', OLD.reconfirmed_amount, 'reconfirmed_to', NEW.reconfirmed_amount,
        'sold_from', OLD.sold_amount, 'sold_to', NEW.sold_amount,
        'cost_from', OLD.cost_amount, 'cost_to', NEW.cost_amount,
        'commission_from', OLD.commission_amount, 'commission_to', NEW.commission_amount
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_travel_file_service_change ON public.travel_file_services;
CREATE TRIGGER trg_log_travel_file_service_change
  AFTER UPDATE ON public.travel_file_services
  FOR EACH ROW EXECUTE FUNCTION public.log_travel_file_service_change();