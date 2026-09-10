-- =====================================================================
-- Central de Reservas — elegibilidade, situação do serviço e observações.
-- Aditivo: nenhuma leitura existente é revogada, nada é apagado.
-- =====================================================================

-- Elegibilidade da Central manual. Espelha exatamente a regra da interface
-- (hasFeature('crm_basic')): admin/promotor, concessão individual, colaborador
-- ativo (herda a agência master) ou plano vigente com CRM.
-- NÃO usa has_feature_access (divergente) nem agency_can_use_booking_requests
-- (exige site white label + Premium literal).
CREATE OR REPLACE FUNCTION public.can_use_reservations_center()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan text;
  v_active boolean;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF public.has_role(v_uid, 'admin'::public.app_role)
     OR public.has_role(v_uid, 'promotor'::public.app_role) THEN
    RETURN true;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_feature_access ufa
              WHERE ufa.user_id = v_uid AND ufa.feature_key = 'crm_basic') THEN
    RETURN true;
  END IF;

  -- Colaborador ATIVO herda o contexto da conta master; inativo não.
  IF EXISTS (SELECT 1 FROM public.agency_team_members tm
              WHERE tm.auth_user_id = v_uid AND tm.status = 'active') THEN
    RETURN true;
  END IF;

  SELECT es.plan, es.is_active, es.expires_at
    INTO v_plan, v_active, v_expires
    FROM public.effective_subscription() es
   LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN RETURN false; END IF;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN RETURN false; END IF;

  -- Matriz atual de crm_basic (Premium, Fundador, Promoção Grupo SC).
  RETURN COALESCE(v_plan, 'start') IN ('premium', 'fundador', 'promo_grupo_sc');
END $$;

REVOKE ALL ON FUNCTION public.can_use_reservations_center() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_reservations_center() TO authenticated, service_role;

-- ---------- criação manual: exige elegibilidade ----------
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
  v_currency text := private.reservations_currency(_payload->>'currency', 'BRL');
  v_start date := NULLIF(_payload->>'start_date','')::date;
  v_end date := NULLIF(_payload->>'end_date','')::date;
  v_amount numeric := 0;
  v_adults integer := private.reservations_count(_payload, 'adults_count', 0);
  v_children integer := private.reservations_count(_payload, 'children_count', 0);
  v_member uuid;
  v_number integer;
  v_id uuid;
BEGIN
  IF NOT public.can_use_reservations_center() THEN
    RAISE EXCEPTION 'A Central de Reservas não está disponível no seu plano atual.';
  END IF;

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

  PERFORM private.reservations_check_dates(v_start, v_end);

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
                    WHERE tm.id = v_responsible
                      AND tm.agency_id = v_agency
                      AND tm.status = 'active') THEN
      RAISE EXCEPTION 'Responsável não encontrado nesta agência.';
    END IF;
  END IF;

  IF public.can_team('reservations.financial.manage') THEN
    v_amount := COALESCE(private.reservations_amount(_payload, 'requested_amount'), 0);
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
    v_start, v_end,
    v_adults, v_children, v_adults + v_children, v_currency,
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

-- ---------- edição do rascunho: exige elegibilidade ----------
CREATE OR REPLACE FUNCTION public.travel_file_update_manual(_file_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_use_reservations_center() THEN
    RAISE EXCEPTION 'A Central de Reservas não está disponível no seu plano atual.';
  END IF;
  PERFORM private.travel_file_update_manual_apply(_file_id, _payload);
END $$;

REVOKE ALL ON FUNCTION public.travel_file_update_manual(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_update_manual(uuid, jsonb) TO authenticated, service_role;

-- Corpo original preservado integralmente em uma função interna.
CREATE OR REPLACE FUNCTION private.travel_file_update_manual_apply(_file_id uuid, _payload jsonb)
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
  v_start date := NULLIF(_payload->>'start_date','')::date;
  v_end date := NULLIF(_payload->>'end_date','')::date;
  v_currency text;
  v_adults integer;
  v_children integer;
  v_amount numeric;
BEGIN
  v_file := private.assert_travel_file_access(_file_id, 'reservations.manage');
  v_agency := v_file.agency_id;

  IF v_file.origin <> 'manual' THEN
    RAISE EXCEPTION 'Esta reserva veio da solicitação do site e não pode ser editada aqui.';
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

  PERFORM private.reservations_check_dates(v_start, v_end);

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

  v_currency := private.reservations_currency(_payload->>'currency', v_file.currency);
  v_adults := COALESCE(private.reservations_count(_payload, 'adults_count', COALESCE(v_file.adults_count, 0)), 0);
  v_children := COALESCE(private.reservations_count(_payload, 'children_count', COALESCE(v_file.children_count, 0)), 0);

  v_amount := CASE WHEN public.can_team('reservations.financial.manage')
                   THEN COALESCE(private.reservations_amount(_payload, 'requested_amount'),
                                 COALESCE(v_file.requested_amount, 0))
                   ELSE COALESCE(v_file.requested_amount, 0) END;

  UPDATE public.travel_files f
     SET contractor_type = v_type,
         client_id = v_client,
         company_id = v_company,
         contact_client_id = v_contact,
         trip_name = v_trip,
         primary_destination = v_dest,
         destinations = CASE WHEN v_dest IS NULL THEN '{}'::text[] ELSE ARRAY[v_dest] END,
         start_date = v_start,
         end_date = v_end,
         adults_count = v_adults,
         children_count = v_children,
         passengers_count = v_adults + v_children,
         currency = v_currency,
         requested_amount = v_amount,
         updated_at = now()
   WHERE f.id = v_file.id;
END $$;

REVOKE ALL ON FUNCTION private.travel_file_update_manual_apply(uuid, jsonb) FROM PUBLIC, anon;

-- ---------- serviço manual: elegibilidade, situação preservada, observações apagáveis ----------
CREATE OR REPLACE FUNCTION public.travel_file_service_manual_save(_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service public.travel_file_services;
  v_file public.travel_files;
  v_id uuid := NULLIF(_payload->>'service_id','')::uuid;
  v_file_id uuid := NULLIF(_payload->>'file_id','')::uuid;
  v_type text := COALESCE(NULLIF(btrim(_payload->>'service_type'),''), 'outros');
  v_name text := NULLIF(btrim(COALESCE(_payload->>'product_name','')), '');
  v_supplier uuid := NULLIF(_payload->>'supplier_id','')::uuid;
  v_status text;
  v_start date := NULLIF(_payload->>'start_date','')::date;
  v_end date := NULLIF(_payload->>'end_date','')::date;
  v_qty integer;
  v_currency text;
  v_amount numeric;
  v_notes_sent boolean := (_payload ? 'notes');
  v_notes text := NULLIF(btrim(COALESCE(_payload->>'notes','')), '');
  v_snapshot jsonb;
  v_fin boolean := public.can_team('reservations.financial.manage');
BEGIN
  IF NOT public.can_use_reservations_center() THEN
    RAISE EXCEPTION 'A Central de Reservas não está disponível no seu plano atual.';
  END IF;

  IF v_id IS NOT NULL THEN
    SELECT * INTO v_service FROM public.travel_file_services WHERE id = v_id;
    IF v_service.id IS NULL THEN RAISE EXCEPTION 'Serviço não encontrado.'; END IF;
    v_file_id := v_service.file_id;
  END IF;

  v_file := private.assert_travel_file_access(v_file_id, 'reservations.manage');

  -- Serviços de reservas vindas do site permanecem congelados no fluxo original.
  IF v_file.origin <> 'manual' THEN
    RAISE EXCEPTION 'Os serviços desta reserva vêm da solicitação do site e não podem ser alterados aqui.';
  END IF;

  IF v_name IS NULL THEN RAISE EXCEPTION 'Informe o nome do serviço.'; END IF;

  -- Na edição a situação atual é preservada quando não for enviada;
  -- 'requested' é apenas o padrão de um serviço novo.
  v_status := COALESCE(NULLIF(_payload->>'status',''), v_service.status, 'requested');
  IF v_status NOT IN ('requested','reconfirming','available','amount_changed','unavailable',
                      'awaiting_client','booked','paid','issued','delivered','cancelled') THEN
    RAISE EXCEPTION 'Situação do serviço inválida.';
  END IF;

  PERFORM private.reservations_check_dates(v_start, v_end);
  v_currency := private.reservations_currency(_payload->>'currency',
                  COALESCE(v_service.currency, v_file.currency));
  v_qty := COALESCE(private.reservations_count(_payload, 'quantity', COALESCE(v_service.quantity, 1)), 1);
  IF v_qty < 1 THEN RAISE EXCEPTION 'A quantidade deve ser pelo menos 1.'; END IF;

  IF v_supplier IS NOT NULL AND NOT private.reservations_supplier_allowed(
       v_supplier, private.agency_owner_ids()) THEN
    RAISE EXCEPTION 'Fornecedor não disponível para esta agência.';
  END IF;

  v_amount := CASE WHEN v_fin
                   THEN COALESCE(private.reservations_amount(_payload, 'requested_amount'),
                                 COALESCE(v_service.requested_amount, 0))
                   ELSE COALESCE(v_service.requested_amount, 0) END;

  IF v_service.id IS NULL THEN
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
      v_start, v_end, v_qty, v_currency,
      v_amount, false, v_status,
      jsonb_strip_nulls(jsonb_build_object('origin', 'manual', 'notes', v_notes))
    ) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  -- Observações: enviado vazio apaga; omitido preserva o texto anterior.
  v_snapshot := COALESCE(v_service.snapshot, '{}'::jsonb);
  IF v_notes_sent THEN
    v_snapshot := CASE
      WHEN v_notes IS NULL THEN v_snapshot - 'notes'
      ELSE jsonb_set(v_snapshot, '{notes}', to_jsonb(v_notes), true)
    END;
  END IF;

  UPDATE public.travel_file_services s
     SET service_type = v_type,
         product_name = v_name,
         supplier_name = NULLIF(btrim(COALESCE(_payload->>'supplier_name','')), ''),
         supplier_id = v_supplier,
         city = NULLIF(btrim(COALESCE(_payload->>'city','')), ''),
         destination = NULLIF(btrim(COALESCE(_payload->>'destination','')), ''),
         country = NULLIF(btrim(COALESCE(_payload->>'country','')), ''),
         start_date = v_start,
         end_date = v_end,
         quantity = v_qty,
         currency = v_currency,
         status = v_status,
         requested_amount = v_amount,
         snapshot = v_snapshot,
         updated_at = now()
   WHERE s.id = v_service.id;

  RETURN v_service.id;
END $function$;

REVOKE ALL ON FUNCTION public.travel_file_service_manual_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_service_manual_save(jsonb) TO authenticated;