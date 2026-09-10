-- =====================================================================
-- Central de Reservas — correções da revisão (aditivo, nada é apagado).
-- =====================================================================

-- ---------- helpers de validação ----------
CREATE OR REPLACE FUNCTION private.reservations_amount(_payload jsonb, _key text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE v numeric;
BEGIN
  v := NULLIF(btrim(COALESCE(_payload->>_key, '')), '')::numeric;
  IF v IS NULL THEN RETURN NULL; END IF;
  IF v = 'NaN'::numeric OR v = 'Infinity'::numeric OR v = '-Infinity'::numeric THEN
    RAISE EXCEPTION 'Informe um valor numérico válido.';
  END IF;
  IF v < 0 THEN RAISE EXCEPTION 'O valor não pode ser negativo.'; END IF;
  IF v > 999999999 THEN RAISE EXCEPTION 'O valor informado é muito alto.'; END IF;
  RETURN round(v, 2);
END $$;

CREATE OR REPLACE FUNCTION private.reservations_currency(_value text, _fallback text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE v text := upper(NULLIF(btrim(COALESCE(_value, '')), ''));
BEGIN
  v := COALESCE(v, upper(COALESCE(NULLIF(btrim(_fallback), ''), 'BRL')));
  IF v NOT IN ('BRL','USD','EUR') THEN
    RAISE EXCEPTION 'Moeda não suportada. Use BRL, USD ou EUR.';
  END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION private.reservations_check_dates(_start date, _end date)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF _start IS NOT NULL AND _end IS NOT NULL AND _end < _start THEN
    RAISE EXCEPTION 'A data final não pode ser anterior à data inicial.';
  END IF;
  IF _start IS NOT NULL AND (_start < date '1900-01-01' OR _start > date '2100-12-31') THEN
    RAISE EXCEPTION 'Informe uma data inicial válida.';
  END IF;
  IF _end IS NOT NULL AND (_end < date '1900-01-01' OR _end > date '2100-12-31') THEN
    RAISE EXCEPTION 'Informe uma data final válida.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.reservations_count(_payload jsonb, _key text, _default integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE v numeric;
BEGIN
  v := NULLIF(btrim(COALESCE(_payload->>_key, '')), '')::numeric;
  IF v IS NULL THEN RETURN _default; END IF;
  IF v = 'NaN'::numeric OR v = 'Infinity'::numeric OR v = '-Infinity'::numeric
     OR v < 0 OR v > 999 OR v <> trunc(v) THEN
    RAISE EXCEPTION 'Informe uma quantidade válida de pessoas.';
  END IF;
  RETURN v::integer;
END $$;

-- Fornecedor: catálogo global aprovado OU cadastro privado da própria agência.
CREATE OR REPLACE FUNCTION private.reservations_supplier_allowed(_supplier uuid, _agencies uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tour_operators o
     WHERE o.id = _supplier
       AND (
         (o.owner_agency_id IS NULL
            AND COALESCE(o.is_active, true)
            AND COALESCE(o.approval_status, 'approved') = 'approved')
         OR o.owner_agency_id = ANY(_agencies)
         OR o.user_id = ANY(_agencies)
       )
  )
$$;

-- Sanitização financeira recursiva (snapshots, payloads, qualquer nível).
CREATE OR REPLACE FUNCTION private.reservations_redact(
  _data jsonb, _revenue boolean, _margin boolean, _commission boolean)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb;
  v_key text;
  v_val jsonb;
  v_blocked text[] := ARRAY[]::text[];
BEGIN
  IF _data IS NULL THEN RETURN NULL; END IF;
  IF _revenue AND _margin AND _commission THEN RETURN _data; END IF;

  IF NOT _revenue THEN
    v_blocked := v_blocked || ARRAY[
      'requested_amount','reconfirmed_amount','sold_amount','final_sale_amount',
      'total_amount','amount','unit_amount','price','sale_amount',
      'sold_from','sold_to','reconfirmed_from','reconfirmed_to',
      'requested_from','requested_to','amount_from','amount_to','total_from','total_to'];
  END IF;
  IF NOT _margin THEN
    v_blocked := v_blocked || ARRAY['cost_amount','cost','cost_from','cost_to','margin','margin_amount','markup'];
  END IF;
  IF NOT _commission THEN
    v_blocked := v_blocked || ARRAY['commission_amount','commission','commission_from','commission_to','commission_percent'];
  END IF;

  IF jsonb_typeof(_data) = 'object' THEN
    v_out := '{}'::jsonb;
    FOR v_key, v_val IN SELECT * FROM jsonb_each(_data) LOOP
      CONTINUE WHEN v_key = ANY(v_blocked);
      v_out := v_out || jsonb_build_object(
        v_key,
        CASE WHEN jsonb_typeof(v_val) IN ('object','array')
             THEN private.reservations_redact(v_val, _revenue, _margin, _commission)
             ELSE v_val END);
    END LOOP;
    RETURN v_out;
  ELSIF jsonb_typeof(_data) = 'array' THEN
    SELECT COALESCE(jsonb_agg(private.reservations_redact(el, _revenue, _margin, _commission)), '[]'::jsonb)
      INTO v_out FROM jsonb_array_elements(_data) el;
    RETURN v_out;
  END IF;
  RETURN _data;
END $$;

REVOKE ALL ON FUNCTION private.reservations_amount(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reservations_currency(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reservations_check_dates(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reservations_count(jsonb, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reservations_supplier_allowed(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reservations_redact(jsonb, boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.agency_owner_ids() TO authenticated, service_role;

-- ---------- 1) criação manual: responsável, datas, moeda, valores, passageiros ----------
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

-- ---------- 2) edição manual: mesmas validações ----------
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
  v_start date := NULLIF(_payload->>'start_date','')::date;
  v_end date := NULLIF(_payload->>'end_date','')::date;
  v_adults integer;
  v_children integer;
  v_amount numeric;
  v_currency text;
BEGIN
  v_file := private.assert_travel_file_access(_file_id, 'reservations.manage');
  IF v_file.origin <> 'manual' THEN
    RAISE EXCEPTION 'Esta reserva veio de uma solicitação do site e não pode ter os dados básicos alterados aqui.';
  END IF;
  v_agency := v_file.agency_id;
  v_adults := private.reservations_count(_payload, 'adults_count', v_file.adults_count);
  v_children := private.reservations_count(_payload, 'children_count', v_file.children_count);
  v_currency := private.reservations_currency(_payload->>'currency', v_file.currency);

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

  v_amount := CASE WHEN public.can_team('reservations.financial.manage')
                        AND _payload ? 'requested_amount'
                   THEN COALESCE(private.reservations_amount(_payload, 'requested_amount'), 0)
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

REVOKE ALL ON FUNCTION public.travel_file_update_manual(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_update_manual(uuid, jsonb) TO authenticated, service_role;

-- ---------- 3) serviços manuais: bloquear edição de serviço do site ----------
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
  v_status text := COALESCE(NULLIF(_payload->>'status',''), 'requested');
  v_start date := NULLIF(_payload->>'start_date','')::date;
  v_end date := NULLIF(_payload->>'end_date','')::date;
  v_qty integer;
  v_currency text;
  v_amount numeric;
  v_fin boolean := public.can_team('reservations.financial.manage');
BEGIN
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
         start_date = v_start,
         end_date = v_end,
         quantity = v_qty,
         currency = v_currency,
         status = v_status,
         requested_amount = v_amount,
         snapshot = s.snapshot || jsonb_strip_nulls(jsonb_build_object(
           'notes', NULLIF(btrim(COALESCE(_payload->>'notes','')), ''))),
         updated_at = now()
   WHERE s.id = v_service.id;

  RETURN v_service.id;
END $function$;

REVOKE ALL ON FUNCTION public.travel_file_service_manual_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_service_manual_save(jsonb) TO authenticated;

-- ---------- 4) etapas: regras legadas restauradas + draft ----------
CREATE OR REPLACE FUNCTION public.travel_file_set_status(
  _file_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _file public.travel_files;
  _clean_reason text := NULLIF(btrim(COALESCE(_reason, '')), '');
  _pre_sale text[] := ARRAY['draft','request_received','awaiting_reconfirmation','partially_available','awaiting_client'];
  _sold text[] := ARRAY['sale_confirmed','in_operation','trip_completed'];
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
  IF _status = 'request_received' AND _file.status = ANY(_sold) THEN
    RAISE EXCEPTION 'Não é possível voltar para "Solicitação recebida" depois da venda confirmada. Escolha "Aguardando cliente" ou cancele o processo informando o motivo.';
  END IF;
  IF _status = 'draft' AND _file.status = ANY(_sold) THEN
    RAISE EXCEPTION 'Não é possível voltar para "Rascunho" depois da venda confirmada. Escolha "Aguardando cliente" ou cancele o processo informando o motivo.';
  END IF;

  UPDATE public.travel_files f
     SET status = _status,
         cancellation_reason = CASE WHEN _status = 'cancelled' THEN left(_clean_reason, 1000) ELSE NULL END,
         cancelled_at = CASE WHEN _status = 'cancelled' THEN COALESCE(f.cancelled_at, now()) ELSE NULL END,
         confirmed_at = CASE
             WHEN _status = ANY(_sold) THEN COALESCE(f.confirmed_at, now())
             WHEN _status = ANY(_pre_sale) THEN NULL
             ELSE f.confirmed_at END,
         completed_at = CASE
             WHEN _status = 'trip_completed' THEN COALESCE(f.completed_at, now())
             WHEN _status = 'cancelled' THEN f.completed_at
             ELSE NULL END,
         updated_at = now()
   WHERE f.id = _file.id;
END $function$;

REVOKE ALL ON FUNCTION public.travel_file_set_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_set_status(uuid, text, text) TO authenticated, service_role;

-- ---------- 5) busca de empresas sem ILIKE '%%' ----------
CREATE OR REPLACE FUNCTION public.agency_companies_search(_search text DEFAULT NULL, _limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid := private.reservations_agency_id();
  v_q text := NULLIF(btrim(COALESCE(_search, '')), '');
  v_digits text := NULLIF(regexp_replace(COALESCE(_search, ''), '\D', '', 'g'), '');
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
         AND (
           v_q IS NULL
           OR c.name ILIKE '%' || v_q || '%'
           OR COALESCE(c.trade_name,'') ILIKE '%' || v_q || '%'
           OR (v_digits IS NOT NULL
               AND COALESCE(c.cnpj_normalized,'') ILIKE '%' || v_digits || '%')
         )
       ORDER BY c.name
       LIMIT v_limit
    ) co;

  RETURN v_rows;
END $$;

REVOKE ALL ON FUNCTION public.agency_companies_search(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_companies_search(text, integer) TO authenticated, service_role;

-- ---------- 6) histórico manual mais completo ----------
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
  v_payload jsonb;
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
                               'service_type', NEW.service_type, 'status', NEW.status,
                               'quantity', NEW.quantity, 'currency', NEW.currency));
    RETURN NEW;
  END IF;

  v_payload := jsonb_strip_nulls(jsonb_build_object(
    'service_id', NEW.id,
    'product_name', NEW.product_name,
    'status', CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN NEW.status END,
    'service_type', CASE WHEN NEW.service_type IS DISTINCT FROM OLD.service_type THEN NEW.service_type END,
    'quantity', CASE WHEN NEW.quantity IS DISTINCT FROM OLD.quantity THEN NEW.quantity END,
    'currency', CASE WHEN NEW.currency IS DISTINCT FROM OLD.currency THEN NEW.currency END,
    'supplier_id', CASE WHEN NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN NEW.supplier_id END,
    'supplier_name', CASE WHEN NEW.supplier_name IS DISTINCT FROM OLD.supplier_name THEN NEW.supplier_name END,
    'start_date', CASE WHEN NEW.start_date IS DISTINCT FROM OLD.start_date THEN NEW.start_date END,
    'end_date', CASE WHEN NEW.end_date IS DISTINCT FROM OLD.end_date THEN NEW.end_date END,
    'destination', CASE WHEN NEW.destination IS DISTINCT FROM OLD.destination THEN NEW.destination END,
    'notes_changed', CASE WHEN COALESCE(NEW.snapshot->>'notes','') IS DISTINCT FROM COALESCE(OLD.snapshot->>'notes','') THEN true END,
    'snapshot_changed', CASE WHEN NEW.snapshot IS DISTINCT FROM OLD.snapshot THEN true END,
    'requested_amount', CASE WHEN NEW.requested_amount IS DISTINCT FROM OLD.requested_amount THEN NEW.requested_amount END,
    'reconfirmed_amount', CASE WHEN NEW.reconfirmed_amount IS DISTINCT FROM OLD.reconfirmed_amount THEN NEW.reconfirmed_amount END,
    'sold_amount', CASE WHEN NEW.sold_amount IS DISTINCT FROM OLD.sold_amount THEN NEW.sold_amount END,
    'cost_amount', CASE WHEN NEW.cost_amount IS DISTINCT FROM OLD.cost_amount THEN NEW.cost_amount END,
    'commission_amount', CASE WHEN NEW.commission_amount IS DISTINCT FROM OLD.commission_amount THEN NEW.commission_amount END
  ));

  IF (SELECT count(*) FROM jsonb_object_keys(v_payload)) > 2
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.file_id, NEW.agency_id, 'file_service_changed', auth.uid(), v_member, v_name, v_payload);
  END IF;

  RETURN NEW;
END $$;

-- ---------- 7) detalhe com sanitização financeira em todos os níveis ----------
CREATE OR REPLACE FUNCTION public.travel_file_detail(_file_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_file public.travel_files;
  v_revenue boolean := public.can_team('financial.view_revenue');
  v_margin boolean := public.can_team('financial.view_margin');
  v_commission boolean := public.can_team('financial.commissions.view');
  v_services jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_client jsonb;
  v_company jsonb;
  v_contact jsonb;
  v_quote jsonb;
  v_file_json jsonb;
BEGIN
  v_file := private.assert_travel_file_access(_file_id, 'reservations.view');

  v_file_json := private.reservations_redact(to_jsonb(v_file), v_revenue, v_margin, v_commission);

  SELECT COALESCE(jsonb_agg(
           private.reservations_redact(to_jsonb(s), v_revenue, v_margin, v_commission)
           ORDER BY s.created_at), '[]'::jsonb)
    INTO v_services
    FROM public.travel_file_services s WHERE s.file_id = v_file.id;

  -- Histórico combinado: solicitações do site (intactas) + registros internos.
  SELECT COALESCE(jsonb_agg(row_to_json(src)::jsonb - 'sort_at' ORDER BY src.sort_at), '[]'::jsonb)
    INTO v_events
    FROM (
      SELECT ev.id::text AS id, ev.event_type, ev.actor_type,
             NULL::text AS actor_name,
             private.reservations_redact(COALESCE(ev.payload, '{}'::jsonb),
                                        v_revenue, v_margin, v_commission) AS payload,
             ev.created_at, ev.created_at AS sort_at
        FROM public.quote_booking_request_events ev
       WHERE COALESCE(v_file.current_request_id, v_file.root_request_id) IS NOT NULL
         AND ev.request_id = COALESCE(v_file.current_request_id, v_file.root_request_id)
      UNION ALL
      SELECT e.id::text AS id, e.event_type, 'agency'::text AS actor_type,
             e.actor_name,
             private.reservations_redact(COALESCE(e.payload, '{}'::jsonb),
                                        v_revenue, v_margin, v_commission) AS payload,
             e.created_at, e.created_at AS sort_at
        FROM public.travel_file_events e
       WHERE e.file_id = v_file.id
    ) src;

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
END $function$;

REVOKE ALL ON FUNCTION public.travel_file_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_detail(uuid) TO authenticated;

-- ---------- 8) bypass de SELECT direto: proteger dados manuais e histórico ----------
-- Políticas RESTRICTIVE: as linhas antigas (origem web) continuam legíveis como
-- hoje para não quebrar o frontend já publicado; as linhas MANUAIS e o novo
-- histórico só são legíveis direto por quem tem todas as permissões sensíveis.
DROP POLICY IF EXISTS travel_files_manual_direct_read_guard ON public.travel_files;
CREATE POLICY travel_files_manual_direct_read_guard
ON public.travel_files AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  COALESCE(origin, 'web_quote') <> 'manual'
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.can_team('financial.view_revenue')
      AND public.can_team('financial.view_margin')
      AND public.can_team('financial.commissions.view'))
);

DROP POLICY IF EXISTS travel_file_services_manual_direct_read_guard ON public.travel_file_services;
CREATE POLICY travel_file_services_manual_direct_read_guard
ON public.travel_file_services AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  NOT EXISTS (SELECT 1 FROM public.travel_files f
               WHERE f.id = travel_file_services.file_id AND f.origin = 'manual')
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.can_team('financial.view_revenue')
      AND public.can_team('financial.view_margin')
      AND public.can_team('financial.commissions.view'))
);

DROP POLICY IF EXISTS travel_file_events_direct_read_guard ON public.travel_file_events;
CREATE POLICY travel_file_events_direct_read_guard
ON public.travel_file_events AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.can_team('financial.view_revenue')
      AND public.can_team('financial.view_margin')
      AND public.can_team('financial.commissions.view'))
);

-- ---------- 9) empresas: permissões reais (sem OR permissivo amplo) ----------
DROP POLICY IF EXISTS companies_agency_members_full_access ON public.companies;
DROP POLICY IF EXISTS client_companies_agency_members_full_access ON public.client_companies;

DROP POLICY IF EXISTS companies_agency_scope_select ON public.companies;
CREATE POLICY companies_agency_scope_select
ON public.companies FOR SELECT TO authenticated
USING (user_id = ANY(private.agency_owner_ids())
       AND (user_id = auth.uid() OR public.can_team('clients.view')));

DROP POLICY IF EXISTS companies_agency_scope_insert ON public.companies;
CREATE POLICY companies_agency_scope_insert
ON public.companies FOR INSERT TO authenticated
WITH CHECK (user_id = ANY(private.agency_owner_ids())
            AND (user_id = auth.uid() OR public.can_team('clients.create')));

DROP POLICY IF EXISTS companies_agency_scope_update ON public.companies;
CREATE POLICY companies_agency_scope_update
ON public.companies FOR UPDATE TO authenticated
USING (user_id = ANY(private.agency_owner_ids())
       AND (user_id = auth.uid() OR public.can_team('clients.edit')))
WITH CHECK (user_id = ANY(private.agency_owner_ids()));

DROP POLICY IF EXISTS companies_agency_scope_delete ON public.companies;
CREATE POLICY companies_agency_scope_delete
ON public.companies FOR DELETE TO authenticated
USING (user_id = ANY(private.agency_owner_ids())
       AND (user_id = auth.uid() OR public.can_team('clients.delete')));

DROP POLICY IF EXISTS client_companies_agency_scope_select ON public.client_companies;
CREATE POLICY client_companies_agency_scope_select
ON public.client_companies FOR SELECT TO authenticated
USING (user_id = ANY(private.agency_owner_ids())
       AND (user_id = auth.uid() OR public.can_team('clients.view')));

DROP POLICY IF EXISTS client_companies_agency_scope_insert ON public.client_companies;
CREATE POLICY client_companies_agency_scope_insert
ON public.client_companies FOR INSERT TO authenticated
WITH CHECK (user_id = ANY(private.agency_owner_ids())
            AND (user_id = auth.uid() OR public.can_team('clients.edit')
                 OR public.can_team('clients.create')));

DROP POLICY IF EXISTS client_companies_agency_scope_update ON public.client_companies;
CREATE POLICY client_companies_agency_scope_update
ON public.client_companies FOR UPDATE TO authenticated
USING (user_id = ANY(private.agency_owner_ids())
       AND (user_id = auth.uid() OR public.can_team('clients.edit')))
WITH CHECK (user_id = ANY(private.agency_owner_ids()));

DROP POLICY IF EXISTS client_companies_agency_scope_delete ON public.client_companies;
CREATE POLICY client_companies_agency_scope_delete
ON public.client_companies FOR DELETE TO authenticated
USING (user_id = ANY(private.agency_owner_ids())
       AND (user_id = auth.uid() OR public.can_team('clients.edit')));
