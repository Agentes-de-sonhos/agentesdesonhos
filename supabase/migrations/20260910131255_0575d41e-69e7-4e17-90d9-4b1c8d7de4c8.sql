-- =====================================================================
-- CENTRAL DE RESERVAS — primeira entrega (aditiva).
-- Reaproveita travel_files como raiz. Nada e removido; nenhum dado e apagado.
-- =====================================================================

-- ---------- 1) colunas aditivas ----------
ALTER TABLE public.travel_files
  ALTER COLUMN root_request_id DROP NOT NULL;

ALTER TABLE public.travel_files
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'web_quote',
  ADD COLUMN IF NOT EXISTS contractor_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS contact_client_id uuid,
  ADD COLUMN IF NOT EXISTS contact_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trip_name text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_team_member_id uuid,
  ADD COLUMN IF NOT EXISTS manual_key text;

ALTER TABLE public.travel_files DROP CONSTRAINT IF EXISTS travel_files_origin_check;
ALTER TABLE public.travel_files
  ADD CONSTRAINT travel_files_origin_check CHECK (origin IN ('web_quote','manual'));

ALTER TABLE public.travel_files DROP CONSTRAINT IF EXISTS travel_files_contractor_type_check;
ALTER TABLE public.travel_files
  ADD CONSTRAINT travel_files_contractor_type_check CHECK (contractor_type IN ('individual','company'));

-- origem web continua exigindo a solicitacao raiz; manual pode nao ter
ALTER TABLE public.travel_files DROP CONSTRAINT IF EXISTS travel_files_origin_request_check;
ALTER TABLE public.travel_files
  ADD CONSTRAINT travel_files_origin_request_check
  CHECK (origin <> 'web_quote' OR root_request_id IS NOT NULL);

-- novo estado: rascunho
ALTER TABLE public.travel_files DROP CONSTRAINT IF EXISTS travel_files_status_check;
ALTER TABLE public.travel_files
  ADD CONSTRAINT travel_files_status_check CHECK (status = ANY (ARRAY[
    'draft','request_received','awaiting_reconfirmation','partially_available',
    'awaiting_client','sale_confirmed','in_operation','trip_completed','cancelled']));

-- clique duplo nunca gera dois files
CREATE UNIQUE INDEX IF NOT EXISTS travel_files_manual_key_unique
  ON public.travel_files (agency_id, manual_key) WHERE manual_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS travel_files_origin_idx ON public.travel_files (agency_id, origin);
CREATE INDEX IF NOT EXISTS travel_files_company_idx ON public.travel_files (agency_id, company_id);

-- ---------- 2) historico interno do file ----------
CREATE TABLE IF NOT EXISTS public.travel_file_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.travel_files(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_user_id uuid,
  actor_team_member_id uuid,
  actor_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.travel_file_events TO authenticated;
GRANT ALL ON public.travel_file_events TO service_role;
ALTER TABLE public.travel_file_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_members_view_file_events ON public.travel_file_events;
CREATE POLICY agency_members_view_file_events
ON public.travel_file_events FOR SELECT TO authenticated
USING (
  (public.is_agency_member(agency_id) AND public.can_team('reservations.view'))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE INDEX IF NOT EXISTS travel_file_events_file_idx
  ON public.travel_file_events (file_id, created_at);

-- ---------- 3) gatilhos de historico (somente origem manual) ----------
CREATE OR REPLACE FUNCTION public.log_travel_file_manual_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_member uuid;
  v_name text;
  v_changes jsonb := '{}'::jsonb;
BEGIN
  IF NEW.origin <> 'manual' THEN RETURN NEW; END IF;

  SELECT tm.id, tm.full_name INTO v_member, v_name
  FROM public.agency_team_members tm
  WHERE tm.auth_user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.id, NEW.agency_id, 'file_created_manual', auth.uid(), v_member, v_name,
            jsonb_build_object('status', NEW.status, 'contractor_type', NEW.contractor_type));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.id, NEW.agency_id, 'file_status_changed', auth.uid(), v_member, v_name,
            jsonb_build_object('from', OLD.status, 'to', NEW.status, 'reason', NEW.cancellation_reason));
  END IF;

  IF NEW.responsible_team_member_id IS DISTINCT FROM OLD.responsible_team_member_id THEN
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.id, NEW.agency_id, 'file_responsible_changed', auth.uid(), v_member, v_name,
            jsonb_build_object('from', OLD.responsible_team_member_id, 'to', NEW.responsible_team_member_id));
  END IF;

  IF NEW.operations_responsible_team_member_id IS DISTINCT FROM OLD.operations_responsible_team_member_id THEN
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.id, NEW.agency_id, 'file_operations_responsible_changed', auth.uid(), v_member, v_name,
            jsonb_build_object('from', OLD.operations_responsible_team_member_id,
                               'to', NEW.operations_responsible_team_member_id));
  END IF;

  IF NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.contractor_type IS DISTINCT FROM OLD.contractor_type
     OR NEW.contact_client_id IS DISTINCT FROM OLD.contact_client_id
     OR NEW.trip_name IS DISTINCT FROM OLD.trip_name
     OR NEW.primary_destination IS DISTINCT FROM OLD.primary_destination
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.adults_count IS DISTINCT FROM OLD.adults_count
     OR NEW.children_count IS DISTINCT FROM OLD.children_count
  THEN
    v_changes := jsonb_strip_nulls(jsonb_build_object(
      'contractor_type', CASE WHEN NEW.contractor_type IS DISTINCT FROM OLD.contractor_type THEN NEW.contractor_type END,
      'trip_name', CASE WHEN NEW.trip_name IS DISTINCT FROM OLD.trip_name THEN NEW.trip_name END,
      'primary_destination', CASE WHEN NEW.primary_destination IS DISTINCT FROM OLD.primary_destination THEN NEW.primary_destination END,
      'start_date', CASE WHEN NEW.start_date IS DISTINCT FROM OLD.start_date THEN NEW.start_date END,
      'end_date', CASE WHEN NEW.end_date IS DISTINCT FROM OLD.end_date THEN NEW.end_date END,
      'passengers', CASE WHEN NEW.adults_count IS DISTINCT FROM OLD.adults_count
                           OR NEW.children_count IS DISTINCT FROM OLD.children_count
                         THEN NEW.adults_count + NEW.children_count END,
      'contractor_changed', CASE WHEN NEW.client_id IS DISTINCT FROM OLD.client_id
                                   OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN true END,
      'contact_changed', CASE WHEN NEW.contact_client_id IS DISTINCT FROM OLD.contact_client_id THEN true END
    ));
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.id, NEW.agency_id, 'file_data_changed', auth.uid(), v_member, v_name, v_changes);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS travel_files_manual_history ON public.travel_files;
CREATE TRIGGER travel_files_manual_history
AFTER INSERT OR UPDATE ON public.travel_files
FOR EACH ROW EXECUTE FUNCTION public.log_travel_file_manual_change();

CREATE OR REPLACE FUNCTION public.log_travel_file_service_manual_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_origin text;
  v_member uuid;
  v_name text;
BEGIN
  SELECT f.origin INTO v_origin FROM public.travel_files f WHERE f.id = NEW.file_id;
  IF COALESCE(v_origin, 'web_quote') <> 'manual' THEN RETURN NEW; END IF;

  SELECT tm.id, tm.full_name INTO v_member, v_name
  FROM public.agency_team_members tm WHERE tm.auth_user_id = auth.uid() LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.file_id, NEW.agency_id, 'file_service_added', auth.uid(), v_member, v_name,
            jsonb_build_object('service_id', NEW.id, 'product_name', NEW.product_name,
                               'service_type', NEW.service_type, 'status', NEW.status));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.product_name IS DISTINCT FROM OLD.product_name
     OR NEW.supplier_name IS DISTINCT FROM OLD.supplier_name
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.requested_amount IS DISTINCT FROM OLD.requested_amount
     OR NEW.reconfirmed_amount IS DISTINCT FROM OLD.reconfirmed_amount
     OR NEW.sold_amount IS DISTINCT FROM OLD.sold_amount
     OR NEW.cost_amount IS DISTINCT FROM OLD.cost_amount
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
  THEN
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.file_id, NEW.agency_id, 'file_service_changed', auth.uid(), v_member, v_name,
            jsonb_strip_nulls(jsonb_build_object(
              'service_id', NEW.id,
              'product_name', NEW.product_name,
              'status', CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN NEW.status END,
              'requested_amount', CASE WHEN NEW.requested_amount IS DISTINCT FROM OLD.requested_amount THEN NEW.requested_amount END,
              'reconfirmed_amount', CASE WHEN NEW.reconfirmed_amount IS DISTINCT FROM OLD.reconfirmed_amount THEN NEW.reconfirmed_amount END,
              'sold_amount', CASE WHEN NEW.sold_amount IS DISTINCT FROM OLD.sold_amount THEN NEW.sold_amount END,
              'cost_amount', CASE WHEN NEW.cost_amount IS DISTINCT FROM OLD.cost_amount THEN NEW.cost_amount END,
              'commission_amount', CASE WHEN NEW.commission_amount IS DISTINCT FROM OLD.commission_amount THEN NEW.commission_amount END
            )));
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS travel_file_services_manual_history ON public.travel_file_services;
CREATE TRIGGER travel_file_services_manual_history
AFTER INSERT OR UPDATE ON public.travel_file_services
FOR EACH ROW EXECUTE FUNCTION public.log_travel_file_service_manual_change();

-- ---------- 4) validacoes compartilhadas ----------
CREATE OR REPLACE FUNCTION private.reservations_agency_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  v_agency := public.user_agency_id(auth.uid());
  IF v_agency IS NULL THEN RAISE EXCEPTION 'Agência não identificada.'; END IF;
  RETURN v_agency;
END $$;

REVOKE ALL ON FUNCTION private.reservations_agency_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.reservations_agency_id() TO authenticated, service_role;

-- ---------- 5) criacao manual ----------
CREATE OR REPLACE FUNCTION public.travel_file_create_manual(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid := private.reservations_agency_id();
  v_key text := NULLIF(btrim(COALESCE(_payload->>'manual_key','')), '');
  v_existing public.travel_files;
  v_client uuid := NULLIF(_payload->>'client_id','')::uuid;
  v_company uuid := NULLIF(_payload->>'company_id','')::uuid;
  v_contact uuid := NULLIF(_payload->>'contact_client_id','')::uuid;
  v_responsible uuid := NULLIF(_payload->>'responsible_team_member_id','')::uuid;
  v_type text := COALESCE(NULLIF(_payload->>'contractor_type',''), 'individual');
  v_trip text := NULLIF(btrim(COALESCE(_payload->>'trip_name','')), '');
  v_dest text := NULLIF(btrim(COALESCE(_payload->>'primary_destination','')), '');
  v_currency text := COALESCE(NULLIF(_payload->>'currency',''), 'BRL');
  v_amount numeric := 0;
  v_adults integer := GREATEST(COALESCE((_payload->>'adults_count')::integer, 1), 0);
  v_children integer := GREATEST(COALESCE((_payload->>'children_count')::integer, 0), 0);
  v_member uuid;
  v_number integer;
  v_id uuid;
BEGIN
  IF NOT public.can_team('reservations.view') OR NOT public.can_team('reservations.manage') THEN
    RAISE EXCEPTION 'Você não possui permissão para criar reservas.';
  END IF;

  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.travel_files
     WHERE agency_id = v_agency AND manual_key = v_key;
    IF v_existing.id IS NOT NULL THEN
      RETURN jsonb_build_object('file_id', v_existing.id,
                                'file_number_display', v_existing.file_number_display,
                                'duplicate', true);
    END IF;
  END IF;

  IF v_type NOT IN ('individual','company') THEN
    RAISE EXCEPTION 'Informe se o contratante é pessoa física ou empresa.';
  END IF;

  IF v_type = 'company' THEN
    IF v_company IS NULL THEN RAISE EXCEPTION 'Selecione a empresa contratante.'; END IF;
    v_client := NULL;
  ELSE
    IF v_client IS NULL THEN RAISE EXCEPTION 'Selecione o cliente contratante.'; END IF;
    v_company := NULL;
  END IF;

  IF v_trip IS NULL AND v_dest IS NULL THEN
    RAISE EXCEPTION 'Informe o nome da viagem ou o destino.';
  END IF;

  IF v_client IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = v_client AND c.user_id = v_agency) THEN
    RAISE EXCEPTION 'Cliente não encontrado nesta agência.';
  END IF;
  IF v_company IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.companies co WHERE co.id = v_company AND co.user_id = v_agency) THEN
    RAISE EXCEPTION 'Empresa não encontrada nesta agência.';
  END IF;
  IF v_contact IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = v_contact AND c.user_id = v_agency) THEN
    RAISE EXCEPTION 'Contato responsável não encontrado nesta agência.';
  END IF;
  IF v_responsible IS NOT NULL THEN
    IF NOT public.can_team('reservations.assign') THEN
      RAISE EXCEPTION 'Você não possui permissão para definir responsáveis.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.agency_team_members tm
                    WHERE tm.id = v_responsible AND tm.agency_owner_id = v_agency) THEN
      RAISE EXCEPTION 'Responsável não encontrado nesta agência.';
    END IF;
  END IF;

  IF public.can_team('reservations.financial.manage') THEN
    v_amount := GREATEST(COALESCE((_payload->>'requested_amount')::numeric, 0), 0);
  END IF;

  SELECT tm.id INTO v_member FROM public.agency_team_members tm
   WHERE tm.auth_user_id = auth.uid() LIMIT 1;

  v_number := public.next_agency_file_number(v_agency);

  INSERT INTO public.travel_files (
    agency_id, file_number, origin, status, contractor_type, client_id, company_id,
    contact_client_id, contact_snapshot, trip_name, primary_destination, destinations,
    start_date, end_date, adults_count, children_count, passengers_count, currency,
    requested_amount, responsible_team_member_id, responsible_user_id,
    created_by_user_id, created_by_team_member_id, manual_key, revision
  ) VALUES (
    v_agency, v_number, 'manual', 'draft', v_type, v_client, v_company,
    v_contact,
    jsonb_strip_nulls(jsonb_build_object(
      'name', NULLIF(btrim(COALESCE(_payload->>'contact_name','')), ''),
      'email', NULLIF(btrim(COALESCE(_payload->>'contact_email','')), ''),
      'phone', NULLIF(btrim(COALESCE(_payload->>'contact_phone','')), '')
    )),
    v_trip, v_dest, CASE WHEN v_dest IS NULL THEN '{}'::text[] ELSE ARRAY[v_dest] END,
    NULLIF(_payload->>'start_date','')::date, NULLIF(_payload->>'end_date','')::date,
    v_adults, v_children, GREATEST(v_adults + v_children, 1), v_currency,
    v_amount, v_responsible, auth.uid(), auth.uid(), v_member, v_key, 1
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('file_id', v_id,
                            'file_number_display', lpad(v_number::text, 7, '0'),
                            'duplicate', false);
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_existing FROM public.travel_files
   WHERE agency_id = v_agency AND manual_key = v_key;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('file_id', v_existing.id,
                              'file_number_display', v_existing.file_number_display,
                              'duplicate', true);
  END IF;
  RAISE;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_create_manual(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_create_manual(jsonb) TO authenticated, service_role;

-- ---------- 6) edicao dos dados basicos (somente origem manual) ----------
CREATE OR REPLACE FUNCTION public.travel_file_update_manual(_file_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_file public.travel_files;
  v_agency uuid;
  v_client uuid := NULLIF(_payload->>'client_id','')::uuid;
  v_company uuid := NULLIF(_payload->>'company_id','')::uuid;
  v_contact uuid := NULLIF(_payload->>'contact_client_id','')::uuid;
  v_type text := COALESCE(NULLIF(_payload->>'contractor_type',''), 'individual');
  v_trip text := NULLIF(btrim(COALESCE(_payload->>'trip_name','')), '');
  v_dest text := NULLIF(btrim(COALESCE(_payload->>'primary_destination','')), '');
  v_adults integer := GREATEST(COALESCE((_payload->>'adults_count')::integer, 1), 0);
  v_children integer := GREATEST(COALESCE((_payload->>'children_count')::integer, 0), 0);
  v_amount numeric;
BEGIN
  v_file := private.assert_travel_file_access(_file_id, 'reservations.manage');
  IF v_file.origin <> 'manual' THEN
    RAISE EXCEPTION 'Esta reserva veio de uma solicitação do site e não pode ter os dados básicos alterados aqui.';
  END IF;
  v_agency := v_file.agency_id;

  IF v_type NOT IN ('individual','company') THEN
    RAISE EXCEPTION 'Informe se o contratante é pessoa física ou empresa.';
  END IF;
  IF v_type = 'company' THEN
    IF v_company IS NULL THEN RAISE EXCEPTION 'Selecione a empresa contratante.'; END IF;
    v_client := NULL;
  ELSE
    IF v_client IS NULL THEN RAISE EXCEPTION 'Selecione o cliente contratante.'; END IF;
    v_company := NULL;
  END IF;
  IF v_trip IS NULL AND v_dest IS NULL THEN
    RAISE EXCEPTION 'Informe o nome da viagem ou o destino.';
  END IF;

  IF v_client IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = v_client AND c.user_id = v_agency) THEN
    RAISE EXCEPTION 'Cliente não encontrado nesta agência.';
  END IF;
  IF v_company IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.companies co WHERE co.id = v_company AND co.user_id = v_agency) THEN
    RAISE EXCEPTION 'Empresa não encontrada nesta agência.';
  END IF;
  IF v_contact IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = v_contact AND c.user_id = v_agency) THEN
    RAISE EXCEPTION 'Contato responsável não encontrado nesta agência.';
  END IF;

  v_amount := CASE WHEN public.can_team('reservations.financial.manage')
                        AND _payload ? 'requested_amount'
                   THEN GREATEST(COALESCE((_payload->>'requested_amount')::numeric, 0), 0)
                   ELSE v_file.requested_amount END;

  UPDATE public.travel_files f
     SET contractor_type = v_type,
         client_id = v_client,
         company_id = v_company,
         contact_client_id = v_contact,
         contact_snapshot = jsonb_strip_nulls(jsonb_build_object(
           'name', NULLIF(btrim(COALESCE(_payload->>'contact_name','')), ''),
           'email', NULLIF(btrim(COALESCE(_payload->>'contact_email','')), ''),
           'phone', NULLIF(btrim(COALESCE(_payload->>'contact_phone','')), '')
         )),
         trip_name = v_trip,
         primary_destination = v_dest,
         destinations = CASE WHEN v_dest IS NULL THEN '{}'::text[] ELSE ARRAY[v_dest] END,
         start_date = NULLIF(_payload->>'start_date','')::date,
         end_date = NULLIF(_payload->>'end_date','')::date,
         adults_count = v_adults,
         children_count = v_children,
         passengers_count = GREATEST(v_adults + v_children, 1),
         currency = COALESCE(NULLIF(_payload->>'currency',''), f.currency),
         requested_amount = v_amount,
         updated_at = now()
   WHERE f.id = v_file.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_update_manual(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_update_manual(uuid, jsonb) TO authenticated, service_role;

-- ---------- 7) servicos manuais (dados basicos; valores exigem permissao) ----------
CREATE OR REPLACE FUNCTION public.travel_file_service_manual_save(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_service public.travel_file_services;
  v_file public.travel_files;
  v_id uuid := NULLIF(_payload->>'service_id','')::uuid;
  v_file_id uuid := NULLIF(_payload->>'file_id','')::uuid;
  v_type text := COALESCE(NULLIF(btrim(_payload->>'service_type'),''), 'outros');
  v_name text := NULLIF(btrim(COALESCE(_payload->>'product_name','')), '');
  v_supplier uuid := NULLIF(_payload->>'supplier_id','')::uuid;
  v_status text := COALESCE(NULLIF(_payload->>'status',''), 'requested');
  v_amount numeric;
  v_fin boolean := public.can_team('reservations.financial.manage');
BEGIN
  IF v_id IS NOT NULL THEN
    SELECT * INTO v_service FROM public.travel_file_services WHERE id = v_id;
    IF v_service.id IS NULL THEN RAISE EXCEPTION 'Serviço não encontrado.'; END IF;
    v_file_id := v_service.file_id;
  END IF;

  v_file := private.assert_travel_file_access(v_file_id, 'reservations.manage');

  IF v_name IS NULL THEN RAISE EXCEPTION 'Informe o nome do serviço.'; END IF;
  IF v_status NOT IN ('requested','reconfirming','available','amount_changed','unavailable',
                      'awaiting_client','booked','paid','issued','delivered','cancelled') THEN
    RAISE EXCEPTION 'Situação do serviço inválida.';
  END IF;
  IF v_supplier IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tour_operators o WHERE o.id = v_supplier) THEN
    RAISE EXCEPTION 'Fornecedor não encontrado.';
  END IF;

  v_amount := CASE WHEN v_fin THEN GREATEST(COALESCE((_payload->>'requested_amount')::numeric, 0), 0)
                   ELSE COALESCE(v_service.requested_amount, 0) END;

  IF v_service.id IS NULL THEN
    IF v_file.origin <> 'manual' THEN
      RAISE EXCEPTION 'Só é possível acrescentar serviços em reservas cadastradas na Central.';
    END IF;
    INSERT INTO public.travel_file_services (
      file_id, agency_id, service_type, product_name, supplier_name, supplier_id,
      city, destination, country, start_date, end_date, quantity, currency,
      requested_amount, is_required, status, snapshot
    ) VALUES (
      v_file.id, v_file.agency_id, v_type, v_name,
      NULLIF(btrim(COALESCE(_payload->>'supplier_name','')), ''), v_supplier,
      NULLIF(btrim(COALESCE(_payload->>'city','')), ''),
      NULLIF(btrim(COALESCE(_payload->>'destination','')), ''),
      NULLIF(btrim(COALESCE(_payload->>'country','')), ''),
      NULLIF(_payload->>'start_date','')::date, NULLIF(_payload->>'end_date','')::date,
      GREATEST(COALESCE((_payload->>'quantity')::integer, 1), 1),
      COALESCE(NULLIF(_payload->>'currency',''), v_file.currency),
      v_amount, false, v_status,
      jsonb_strip_nulls(jsonb_build_object(
        'origin', 'manual',
        'notes', NULLIF(btrim(COALESCE(_payload->>'notes','')), '')))
    ) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  UPDATE public.travel_file_services s
     SET service_type = v_type,
         product_name = v_name,
         supplier_name = NULLIF(btrim(COALESCE(_payload->>'supplier_name','')), ''),
         supplier_id = v_supplier,
         city = NULLIF(btrim(COALESCE(_payload->>'city','')), ''),
         destination = NULLIF(btrim(COALESCE(_payload->>'destination','')), ''),
         country = NULLIF(btrim(COALESCE(_payload->>'country','')), ''),
         start_date = NULLIF(_payload->>'start_date','')::date,
         end_date = NULLIF(_payload->>'end_date','')::date,
         quantity = GREATEST(COALESCE((_payload->>'quantity')::integer, s.quantity), 1),
         status = v_status,
         requested_amount = v_amount,
         snapshot = s.snapshot || jsonb_strip_nulls(jsonb_build_object(
           'notes', NULLIF(btrim(COALESCE(_payload->>'notes','')), ''))),
         updated_at = now()
   WHERE s.id = v_service.id;

  RETURN v_service.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_service_manual_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_service_manual_save(jsonb) TO authenticated, service_role;

-- ---------- 8) leitura da ficha com ocultacao no servidor ----------
CREATE OR REPLACE FUNCTION public.travel_file_detail(_file_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_file public.travel_files;
  v_revenue boolean := public.can_team('financial.view_revenue');
  v_margin boolean := public.can_team('financial.view_margin');
  v_commission boolean := public.can_team('financial.commissions.view');
  v_hidden text[] := ARRAY[]::text[];
  v_services jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_client jsonb;
  v_company jsonb;
  v_contact jsonb;
  v_quote jsonb;
  v_file_json jsonb;
BEGIN
  v_file := private.assert_travel_file_access(_file_id, 'reservations.view');

  IF NOT v_revenue THEN
    v_hidden := v_hidden || ARRAY['requested_amount','reconfirmed_amount','sold_amount','final_sale_amount'];
  END IF;
  IF NOT v_margin THEN v_hidden := v_hidden || ARRAY['cost_amount']; END IF;
  IF NOT v_commission THEN v_hidden := v_hidden || ARRAY['commission_amount']; END IF;

  v_file_json := (to_jsonb(v_file) - CASE WHEN v_revenue THEN '{}'::text[]
                    ELSE ARRAY['requested_amount','reconfirmed_amount','final_sale_amount'] END);

  SELECT COALESCE(jsonb_agg((to_jsonb(s) - v_hidden) ORDER BY s.created_at), '[]'::jsonb)
    INTO v_services
    FROM public.travel_file_services s WHERE s.file_id = v_file.id;

  -- historico interno (reservas cadastradas na Central)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', e.id, 'event_type', e.event_type, 'actor_type', 'agency',
           'actor_name', e.actor_name,
           'payload', (COALESCE(e.payload, '{}'::jsonb) - v_hidden),
           'created_at', e.created_at
         ) ORDER BY e.created_at), '[]'::jsonb)
    INTO v_events
    FROM public.travel_file_events e WHERE e.file_id = v_file.id;

  -- historico das solicitacoes do site permanece intacto
  IF COALESCE(v_file.current_request_id, v_file.root_request_id) IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'id', ev.id, 'event_type', ev.event_type, 'actor_type', ev.actor_type,
             'payload', (COALESCE(ev.payload, '{}'::jsonb) - v_hidden),
             'created_at', ev.created_at
           ) ORDER BY ev.created_at), '[]'::jsonb)
      INTO v_events
      FROM public.quote_booking_request_events ev
     WHERE ev.request_id = COALESCE(v_file.current_request_id, v_file.root_request_id);
  END IF;

  IF v_file.client_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email, 'phone', c.phone)
      INTO v_client FROM public.clients c WHERE c.id = v_file.client_id;
  END IF;
  IF v_file.company_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', co.id, 'name', co.name, 'trade_name', co.trade_name,
                              'cnpj', co.cnpj_normalized, 'email', co.email, 'phone', co.phone)
      INTO v_company FROM public.companies co WHERE co.id = v_file.company_id;
  END IF;
  IF v_file.contact_client_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email, 'phone', c.phone)
      INTO v_contact FROM public.clients c WHERE c.id = v_file.contact_client_id;
  END IF;
  IF v_file.quote_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', q.id, 'status', q.status,
                              'public_access_code', q.public_access_code,
                              'client_name', q.client_name, 'destination', q.destination,
                              'currency', q.currency)
      INTO v_quote FROM public.quotes q WHERE q.id = v_file.quote_id;
  END IF;

  RETURN jsonb_build_object(
    'file', v_file_json,
    'services', v_services,
    'events', v_events,
    'client', v_client,
    'company', v_company,
    'contact', v_contact,
    'quote', v_quote,
    'can', jsonb_build_object(
      'manage', public.can_team('reservations.manage'),
      'assign', public.can_team('reservations.assign'),
      'financial_manage', public.can_team('reservations.financial.manage'),
      'revenue', v_revenue,
      'margin', v_margin,
      'commission', v_commission
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.travel_file_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_detail(uuid) TO authenticated, service_role;

-- ---------- 9) empresas (PJ) reaproveitando companies/client_companies ----------
CREATE OR REPLACE FUNCTION public.agency_companies_search(_search text DEFAULT NULL, _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid := private.reservations_agency_id();
  v_q text := NULLIF(btrim(COALESCE(_search, '')), '');
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
  v_rows jsonb;
BEGIN
  IF NOT public.can_team('clients.view') THEN
    RAISE EXCEPTION 'Você não possui permissão para ver os cadastros de clientes.';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', co.id, 'name', co.name, 'trade_name', co.trade_name,
           'cnpj', co.cnpj_normalized, 'email', co.email, 'phone', co.phone
         ) ORDER BY co.name), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT * FROM public.companies c
       WHERE c.user_id = v_agency
         AND (v_q IS NULL
              OR c.name ILIKE '%' || v_q || '%'
              OR COALESCE(c.trade_name,'') ILIKE '%' || v_q || '%'
              OR COALESCE(c.cnpj_normalized,'') ILIKE '%' || regexp_replace(v_q, '\D', '', 'g') || '%')
       ORDER BY c.name
       LIMIT v_limit
    ) co;

  RETURN v_rows;
END $$;

REVOKE ALL ON FUNCTION public.agency_companies_search(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_companies_search(text, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.agency_company_save(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid := private.reservations_agency_id();
  v_id uuid := NULLIF(_payload->>'company_id','')::uuid;
  v_name text := NULLIF(btrim(COALESCE(_payload->>'name','')), '');
  v_cnpj text := NULLIF(regexp_replace(COALESCE(_payload->>'cnpj',''), '\D', '', 'g'), '');
  v_contact uuid := NULLIF(_payload->>'contact_client_id','')::uuid;
BEGIN
  IF v_name IS NULL THEN RAISE EXCEPTION 'Informe o nome da empresa.'; END IF;
  IF v_cnpj IS NOT NULL AND length(v_cnpj) <> 14 THEN
    RAISE EXCEPTION 'O CNPJ deve ter 14 números.';
  END IF;

  IF v_id IS NULL THEN
    IF NOT public.can_team('clients.create') THEN
      RAISE EXCEPTION 'Você não possui permissão para cadastrar empresas.';
    END IF;
    INSERT INTO public.companies (user_id, name, trade_name, cnpj_normalized, email, phone, notes)
    VALUES (v_agency, v_name,
            NULLIF(btrim(COALESCE(_payload->>'trade_name','')), ''), v_cnpj,
            NULLIF(btrim(COALESCE(_payload->>'email','')), ''),
            NULLIF(btrim(COALESCE(_payload->>'phone','')), ''),
            NULLIF(btrim(COALESCE(_payload->>'notes','')), ''))
    RETURNING id INTO v_id;
  ELSE
    IF NOT public.can_team('clients.edit') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar empresas.';
    END IF;
    UPDATE public.companies co
       SET name = v_name,
           trade_name = NULLIF(btrim(COALESCE(_payload->>'trade_name','')), ''),
           cnpj_normalized = v_cnpj,
           email = NULLIF(btrim(COALESCE(_payload->>'email','')), ''),
           phone = NULLIF(btrim(COALESCE(_payload->>'phone','')), ''),
           notes = COALESCE(NULLIF(btrim(COALESCE(_payload->>'notes','')), ''), co.notes),
           updated_at = now()
     WHERE co.id = v_id AND co.user_id = v_agency;
    IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada nesta agência.'; END IF;
  END IF;

  -- vinculo cliente<->empresa somente quando ha contato real selecionado
  IF v_contact IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = v_contact AND c.user_id = v_agency) THEN
      RAISE EXCEPTION 'Contato responsável não encontrado nesta agência.';
    END IF;
    INSERT INTO public.client_companies (user_id, client_id, company_id, relationship_type, is_primary)
    SELECT v_agency, v_contact, v_id, 'contact', true
     WHERE NOT EXISTS (
       SELECT 1 FROM public.client_companies cc
        WHERE cc.client_id = v_contact AND cc.company_id = v_id);
  END IF;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.agency_company_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_company_save(jsonb) TO authenticated, service_role;

-- ---------- 10) etapas: rascunho + reversao coerente ----------
CREATE OR REPLACE FUNCTION public.travel_file_set_status(
  _file_id uuid,
  _status text,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _file public.travel_files;
  _clean_reason text := NULLIF(btrim(COALESCE(_reason, '')), '');
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.manage');

  IF _status NOT IN ('draft','request_received','awaiting_reconfirmation','partially_available',
                     'awaiting_client','sale_confirmed','in_operation','trip_completed','cancelled') THEN
    RAISE EXCEPTION 'Etapa inválida.';
  END IF;
  IF _status = 'draft' AND _file.origin <> 'manual' THEN
    RAISE EXCEPTION 'Solicitações recebidas pelo site não voltam para rascunho.';
  END IF;
  IF _status = 'cancelled' AND _clean_reason IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.';
  END IF;

  UPDATE public.travel_files f
     SET status = _status,
         cancellation_reason = CASE WHEN _status = 'cancelled' THEN left(_clean_reason, 1000)
                                    ELSE NULL END,
         cancelled_at = CASE WHEN _status = 'cancelled' THEN COALESCE(f.cancelled_at, now())
                             ELSE NULL END,
         confirmed_at = CASE
                          WHEN _status = 'sale_confirmed' THEN COALESCE(f.confirmed_at, now())
                          WHEN _status IN ('in_operation','trip_completed') THEN f.confirmed_at
                          ELSE NULL END,
         completed_at = CASE WHEN _status = 'trip_completed' THEN COALESCE(f.completed_at, now())
                             ELSE NULL END,
         updated_at = now()
   WHERE f.id = _file.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_set_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_set_status(uuid, text, text) TO authenticated, service_role;

-- ---------- 11) listagem: rascunho, origem e contratante ----------
CREATE OR REPLACE FUNCTION public.travel_files_page(
  _search text DEFAULT NULL,
  _statuses text[] DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _responsible uuid DEFAULT NULL,
  _unread boolean DEFAULT false,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20,
  _sort text DEFAULT 'recent'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owners uuid[] := private.agency_owner_ids();
  _limit integer := LEAST(GREATEST(COALESCE(_page_size, 20), 1), 100);
  _q text := NULLIF(btrim(COALESCE(_search, '')), '');
  _digits text;
  _sort_key text := CASE WHEN COALESCE(_sort, 'recent') IN ('recent','updated','travel','number','oldest')
                         THEN _sort ELSE 'recent' END;
  _unread_only boolean := COALESCE(_unread, false);
  _revenue boolean := public.can_team('financial.view_revenue');
  _status_filter text[] := CASE WHEN _statuses IS NULL OR array_length(_statuses, 1) IS NULL
                                THEN NULL ELSE _statuses END;
  _status_matches text[] := ARRAY[]::text[];
  _total bigint := 0;
  _pages integer := 1;
  _page_out integer := GREATEST(COALESCE(_page, 1), 1);
  _offset integer := 0;
  _items jsonb := '[]'::jsonb;
  _counts jsonb := '{}'::jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF NOT public.can_team('reservations.view') THEN
    RAISE EXCEPTION 'Você não possui permissão para ver as reservas.';
  END IF;

  _digits := NULLIF(regexp_replace(COALESCE(_q, ''), '\D', '', 'g'), '');
  IF _digits IS NOT NULL THEN
    _digits := COALESCE(NULLIF(ltrim(_digits, '0'), ''), '0');
  END IF;

  IF _q IS NOT NULL THEN
    SELECT COALESCE(array_agg(s.st), ARRAY[]::text[]) INTO _status_matches
      FROM (VALUES
        ('draft', 'Rascunho'),
        ('request_received', 'Solicitação recebida'),
        ('awaiting_reconfirmation', 'Aguardando reconfirmação'),
        ('partially_available', 'Parcialmente disponível'),
        ('awaiting_client', 'Aguardando cliente'),
        ('sale_confirmed', 'Venda confirmada'),
        ('in_operation', 'Em operação'),
        ('trip_completed', 'Viagem concluída'),
        ('cancelled', 'Cancelada')
      ) s(st, lbl)
     WHERE s.lbl ILIKE '%' || _q || '%';
  END IF;

  WITH scoped AS (
    SELECT f.id, f.status,
           (NOT EXISTS (SELECT 1 FROM public.travel_file_views v
                         WHERE v.file_id = f.id AND v.user_id = _uid)) AS unread,
           f.opened_at, f.origin
      FROM public.travel_files f
      LEFT JOIN public.clients c ON c.id = f.client_id
      LEFT JOIN public.companies co ON co.id = f.company_id
     WHERE f.agency_id = ANY(_owners)
       AND (_from IS NULL OR COALESCE(f.end_date, f.start_date, f.opened_at::date) >= _from)
       AND (_to IS NULL OR COALESCE(f.start_date, f.end_date, f.opened_at::date) <= _to)
       AND (_responsible IS NULL OR f.responsible_team_member_id = _responsible
            OR f.operations_responsible_team_member_id = _responsible)
       AND (
         _q IS NULL
         OR (_digits IS NOT NULL AND f.file_number::text LIKE '%' || _digits || '%')
         OR COALESCE(f.file_number_display, '') ILIKE '%' || _q || '%'
         OR COALESCE(f.primary_destination, '') ILIKE '%' || _q || '%'
         OR COALESCE(f.trip_name, '') ILIKE '%' || _q || '%'
         OR COALESCE(f.protocol_snapshot, '') ILIKE '%' || _q || '%'
         OR COALESCE(c.name, '') ILIKE '%' || _q || '%'
         OR COALESCE(co.name, '') ILIKE '%' || _q || '%'
         OR COALESCE(co.trade_name, '') ILIKE '%' || _q || '%'
         OR EXISTS (SELECT 1 FROM unnest(COALESCE(f.destinations, ARRAY[]::text[])) d
                     WHERE d ILIKE '%' || _q || '%')
         OR f.status = ANY(_status_matches)
         OR EXISTS (
           SELECT 1 FROM public.travel_file_services s
            WHERE s.file_id = f.id
              AND (COALESCE(s.product_name, '') ILIKE '%' || _q || '%'
                   OR COALESCE(s.supplier_name, '') ILIKE '%' || _q || '%'
                   OR COALESCE(s.destination, '') ILIKE '%' || _q || '%')
         )
       )
  ), visible AS (
    SELECT * FROM scoped WHERE (NOT _unread_only OR unread)
  )
  SELECT
    count(*) FILTER (WHERE _status_filter IS NULL OR v.status = ANY(_status_filter)),
    jsonb_build_object(
      'all', count(*),
      'draft', count(*) FILTER (WHERE v.status = 'draft'),
      'new', count(*) FILTER (WHERE v.status = 'request_received'),
      'awaiting_reconfirmation', count(*) FILTER (WHERE v.status = 'awaiting_reconfirmation'),
      'partially_available', count(*) FILTER (WHERE v.status = 'partially_available'),
      'awaiting_client', count(*) FILTER (WHERE v.status = 'awaiting_client'),
      'confirmed', count(*) FILTER (WHERE v.status = 'sale_confirmed'),
      'in_operation', count(*) FILTER (WHERE v.status = 'in_operation'),
      'completed', count(*) FILTER (WHERE v.status = 'trip_completed'),
      'cancelled', count(*) FILTER (WHERE v.status = 'cancelled'),
      -- rascunhos nunca entram no alerta de solicitacao sem tratamento
      'overdue', count(*) FILTER (
        WHERE v.status NOT IN ('draft','sale_confirmed','trip_completed','cancelled')
          AND v.opened_at <= now() - interval '2 days'
      ),
      'unread', count(*) FILTER (WHERE v.unread)
    )
    INTO _total, _counts
  FROM visible v;

  _pages := GREATEST(1, CEIL(_total::numeric / _limit)::integer);
  IF _page_out > _pages THEN _page_out := _pages; END IF;
  _offset := (_page_out - 1) * _limit;

  SELECT COALESCE(jsonb_agg(x.row ORDER BY x.ord), '[]'::jsonb) INTO _items
  FROM (
    SELECT
      row_number() OVER () AS ord,
      to_jsonb(p) - CASE WHEN _revenue THEN '{}'::text[]
                         ELSE ARRAY['requested_amount','reconfirmed_amount','final_sale_amount'] END AS row
    FROM (
      SELECT
        f.id, f.agency_id, f.file_number, f.file_number_display, f.client_id, f.opportunity_id,
        f.quote_id, f.revision, f.protocol_snapshot, f.responsible_team_member_id,
        f.operations_responsible_team_member_id, f.primary_destination, f.destinations,
        f.start_date, f.end_date, f.adults_count, f.children_count, f.passengers_count,
        f.currency, f.pricing_mode, f.status, f.operational_status, f.financial_status,
        f.operation_id, f.opened_at, f.confirmed_at, f.cancelled_at, f.completed_at,
        f.cancellation_reason, f.created_at, f.updated_at,
        f.requested_amount, f.reconfirmed_amount, f.final_sale_amount,
        f.origin, f.contractor_type, f.company_id, f.contact_client_id, f.trip_name,
        COALESCE(co.name, c.name) AS client_name,
        co.name AS company_name,
        COALESCE(sv.services_count, 0)::int AS services_count,
        COALESCE(sv.service_names, ARRAY[]::text[]) AS service_names,
        NOT EXISTS (SELECT 1 FROM public.travel_file_views v
                     WHERE v.file_id = f.id AND v.user_id = _uid) AS unread,
        tm.full_name AS responsible_name,
        tmo.full_name AS operations_responsible_name
      FROM public.travel_files f
      LEFT JOIN public.clients c ON c.id = f.client_id
      LEFT JOIN public.companies co ON co.id = f.company_id
      LEFT JOIN public.agency_team_members tm ON tm.id = f.responsible_team_member_id
      LEFT JOIN public.agency_team_members tmo ON tmo.id = f.operations_responsible_team_member_id
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS services_count,
               (array_agg(s.product_name ORDER BY s.created_at))[1:6] AS service_names
          FROM public.travel_file_services s WHERE s.file_id = f.id
      ) sv ON true
     WHERE f.agency_id = ANY(_owners)
       AND (_status_filter IS NULL OR f.status = ANY(_status_filter))
       AND (_from IS NULL OR COALESCE(f.end_date, f.start_date, f.opened_at::date) >= _from)
       AND (_to IS NULL OR COALESCE(f.start_date, f.end_date, f.opened_at::date) <= _to)
       AND (_responsible IS NULL OR f.responsible_team_member_id = _responsible
            OR f.operations_responsible_team_member_id = _responsible)
       AND (NOT _unread_only OR NOT EXISTS (
             SELECT 1 FROM public.travel_file_views v
              WHERE v.file_id = f.id AND v.user_id = _uid))
       AND (
         _q IS NULL
         OR (_digits IS NOT NULL AND f.file_number::text LIKE '%' || _digits || '%')
         OR COALESCE(f.file_number_display, '') ILIKE '%' || _q || '%'
         OR COALESCE(f.primary_destination, '') ILIKE '%' || _q || '%'
         OR COALESCE(f.trip_name, '') ILIKE '%' || _q || '%'
         OR COALESCE(f.protocol_snapshot, '') ILIKE '%' || _q || '%'
         OR COALESCE(c.name, '') ILIKE '%' || _q || '%'
         OR COALESCE(co.name, '') ILIKE '%' || _q || '%'
         OR COALESCE(co.trade_name, '') ILIKE '%' || _q || '%'
         OR EXISTS (SELECT 1 FROM unnest(COALESCE(f.destinations, ARRAY[]::text[])) d
                     WHERE d ILIKE '%' || _q || '%')
         OR f.status = ANY(_status_matches)
         OR EXISTS (
           SELECT 1 FROM public.travel_file_services s
            WHERE s.file_id = f.id
              AND (COALESCE(s.product_name, '') ILIKE '%' || _q || '%'
                   OR COALESCE(s.supplier_name, '') ILIKE '%' || _q || '%'
                   OR COALESCE(s.destination, '') ILIKE '%' || _q || '%')
         )
       )
     ORDER BY
       CASE WHEN _sort_key = 'oldest' THEN f.opened_at END ASC NULLS LAST,
       CASE WHEN _sort_key = 'travel' THEN f.start_date END ASC NULLS LAST,
       CASE WHEN _sort_key = 'number' THEN f.file_number END DESC NULLS LAST,
       CASE WHEN _sort_key = 'updated' THEN f.updated_at END DESC NULLS LAST,
       CASE WHEN _sort_key = 'recent' THEN f.opened_at END DESC NULLS LAST,
       f.created_at DESC
     LIMIT _limit OFFSET _offset
    ) p
  ) x;

  RETURN jsonb_build_object(
    'total', _total,
    'page', _page_out,
    'page_size', _limit,
    'pages', _pages,
    'sort', _sort_key,
    'items', _items,
    'counts', _counts,
    'can', jsonb_build_object(
      'manage', public.can_team('reservations.manage'),
      'assign', public.can_team('reservations.assign'),
      'revenue', _revenue,
      'margin', public.can_team('financial.view_margin'),
      'commission', public.can_team('financial.commissions.view'),
      'commission_manage', public.can_team('financial.commissions.manage'),
      'financial_manage', public.can_team('reservations.financial.manage')
    )
  );
END $function$;

REVOKE ALL ON FUNCTION public.travel_files_page(text, text[], date, date, uuid, boolean, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_files_page(text, text[], date, date, uuid, boolean, integer, integer, text) TO authenticated, service_role;