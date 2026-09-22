-- Fase 1A (rodada corretiva): bloqueadores da auditoria independente.
-- Nada aqui ativa o fluxo unificado: o entitlement 'unified_workflow_v2'
-- continua desligado e o caminho legado (sem entitlement) é preservado.

-- ============================================================
-- 1) Tipo canônico de produto financeiro (aliases reais da base)
-- ============================================================
CREATE OR REPLACE FUNCTION public.canonical_sale_product_type(_service_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(btrim(coalesce(_service_type, '')))
    WHEN 'flight' THEN 'aereo'
    WHEN 'aereo' THEN 'aereo'
    WHEN 'aéreo' THEN 'aereo'
    WHEN 'air' THEN 'aereo'
    WHEN 'airfare' THEN 'aereo'
    WHEN 'passagem' THEN 'aereo'
    WHEN 'hotel' THEN 'hotel'
    WHEN 'hospedagem' THEN 'hotel'
    WHEN 'lodging' THEN 'hotel'
    WHEN 'accommodation' THEN 'hotel'
    WHEN 'insurance' THEN 'seguro'
    WHEN 'seguro' THEN 'seguro'
    WHEN 'cruise' THEN 'cruzeiro'
    WHEN 'cruzeiro' THEN 'cruzeiro'
    WHEN 'transfer' THEN 'transfer'
    WHEN 'transport' THEN 'transfer'
    WHEN 'transporte' THEN 'transfer'
    WHEN 'attraction' THEN 'atracao'
    WHEN 'atracao' THEN 'atracao'
    WHEN 'atração' THEN 'atracao'
    WHEN 'ingresso' THEN 'atracao'
    WHEN 'ingressos' THEN 'atracao'
    WHEN 'ticket' THEN 'atracao'
    WHEN 'tour' THEN 'atracao'
    WHEN 'passeio' THEN 'atracao'
    WHEN 'car_rental' THEN 'locacao'
    WHEN 'rental_car' THEN 'locacao'
    WHEN 'car' THEN 'locacao'
    WHEN 'locacao' THEN 'locacao'
    WHEN 'locação' THEN 'locacao'
    WHEN 'locacao_veiculo' THEN 'locacao'
    WHEN 'package' THEN 'pacote'
    WHEN 'pacote' THEN 'pacote'
    ELSE 'outro'
  END
$function$;

COMMENT ON FUNCTION public.canonical_sale_product_type(text) IS
  'Normaliza o tipo de serviço (aliases de IA, inglês e português) para o domínio de sale_products.product_type.';

-- Pacote fechado mantém identidade própria (product_type = pacote e
-- source_kind = travel_file_package). CHECK ampliado de forma aditiva.
ALTER TABLE public.sale_products DROP CONSTRAINT IF EXISTS sale_products_product_type_check;
ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_product_type_check
  CHECK (product_type = ANY (ARRAY['aereo','hotel','seguro','cruzeiro','transfer','atracao','locacao','pacote','outro']))
  NOT VALID;

-- ============================================================
-- 2) customer_payments.source aceita pagamento direto da operação
-- ============================================================
ALTER TABLE public.customer_payments DROP CONSTRAINT IF EXISTS customer_payments_source_check;
ALTER TABLE public.customer_payments
  ADD CONSTRAINT customer_payments_source_check
  CHECK (source = ANY (ARRAY['manual','invoice','operation']));

-- ============================================================
-- 3) Fatura volta a alimentar o campo legado de pagamento
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_payment_date timestamptz;
  v_op record;
  v_status text;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices
   WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF v_invoice.id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_payment_date := COALESCE(NEW.payment_date, OLD.payment_date, CURRENT_DATE)::timestamptz;

  IF TG_OP IN ('INSERT','UPDATE') AND v_invoice.client_id IS NOT NULL THEN
    UPDATE public.clients
       SET last_interaction_at = GREATEST(COALESCE(last_interaction_at, v_payment_date), v_payment_date)
     WHERE id = v_invoice.client_id
       AND user_id = v_invoice.user_id;
  END IF;

  FOR v_op IN
    SELECT o.id, o.travel_file_id FROM public.operations o
    WHERE o.user_id = v_invoice.user_id
      AND (
        (v_invoice.source_type = 'operation' AND o.id = v_invoice.source_id)
        OR (v_invoice.source_type = 'quote' AND o.quote_id = v_invoice.source_id)
        OR (v_invoice.source_type = 'opportunity' AND o.opportunity_id = v_invoice.source_id)
      )
  LOOP
    v_status := public.compute_operation_customer_payment_status(v_op.id);
    UPDATE public.operations
       SET customer_payment_status = v_status,
           payment_status = CASE WHEN v_op.travel_file_id IS NULL THEN v_status ELSE payment_status END,
           updated_at = now()
     WHERE id = v_op.id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================
-- 4) recalc_sale_amount deixa de ser NO-OP cego
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_sale_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sale uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sale_id IS DISTINCT FROM OLD.sale_id THEN
    FOREACH _sale IN ARRAY ARRAY[OLD.sale_id, NEW.sale_id] LOOP
      IF _sale IS NOT NULL THEN
        UPDATE public.sales s
           SET sale_amount = (SELECT COALESCE(SUM(sp.sale_price), 0)
                                FROM public.sale_products sp WHERE sp.sale_id = _sale),
               updated_at = now()
         WHERE s.id = _sale;
      END IF;
    END LOOP;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================
-- 5) Regra financeira V2 exige o entitlement (kill switch completo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.travel_file_service_set_financial_rule(
  _service_id uuid,
  _payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _service public.travel_file_services;
  _file public.travel_files;
  _status text;
  _commission_type text;
  _payment_rule text;
  _source text;
BEGIN
  SELECT * INTO _service FROM public.travel_file_services WHERE id = _service_id;
  IF _service.id IS NULL THEN
    RAISE EXCEPTION 'SERVICE_NOT_FOUND';
  END IF;
  _file := private.assert_travel_file_access(_service.file_id, 'reservations.financial.manage');

  IF NOT public.agency_has_entitlement(_file.agency_id, 'unified_workflow_v2') THEN
    RAISE EXCEPTION 'UNIFIED_WORKFLOW_DISABLED: O fluxo unificado de venda não está ativo para esta agência.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.operation_services os
             WHERE os.source_travel_file_service_id = _service_id) THEN
    RAISE EXCEPTION 'ALREADY_CONVERTED: Este serviço já foi convertido para a operação. Ajuste financeiro deve ser feito no módulo financeiro.';
  END IF;

  _status := lower(coalesce(nullif(btrim(coalesce(_payload->>'status', '')), ''), 'confirmed'));
  IF _status NOT IN ('pending', 'confirmed', 'not_applicable') THEN
    RAISE EXCEPTION 'INVALID_RULE_STATUS';
  END IF;

  _commission_type := lower(nullif(btrim(coalesce(_payload->>'commission_type', '')), ''));
  IF _commission_type IS NOT NULL AND _commission_type NOT IN ('percentage', 'percent', 'fixed', 'none') THEN
    RAISE EXCEPTION 'INVALID_COMMISSION_TYPE';
  END IF;

  _payment_rule := lower(nullif(btrim(coalesce(_payload->>'payment_rule', '')), ''));
  _source := lower(coalesce(nullif(btrim(coalesce(_payload->>'source', '')), ''), 'manual'));
  IF _source NOT IN ('agency_terms', 'manual') THEN
    _source := 'manual';
  END IF;

  UPDATE public.travel_file_services s
     SET operator_id = CASE
           WHEN _payload ? 'operator_id' THEN nullif(btrim(coalesce(_payload->>'operator_id', '')), '')::uuid
           ELSE s.operator_id END,
         supplier_name = CASE
           WHEN _payload ? 'supplier_name' THEN nullif(btrim(coalesce(_payload->>'supplier_name', '')), '')
           ELSE s.supplier_name END,
         commission_type = _commission_type,
         commission_percent = nullif(btrim(coalesce(_payload->>'commission_percent', '')), '')::numeric,
         commission_fixed = nullif(btrim(coalesce(_payload->>'commission_fixed', '')), '')::numeric,
         non_commissionable_fees = coalesce(nullif(btrim(coalesce(_payload->>'non_commissionable_fees', '')), '')::numeric, 0),
         payment_rule = _payment_rule,
         payment_days = nullif(btrim(coalesce(_payload->>'payment_days', '')), '')::int,
         requires_invoice = coalesce((_payload->>'requires_invoice')::boolean, false),
         financial_rule_status = _status,
         financial_rule_snapshot = jsonb_build_object(
             'source', _source,
             'status', _status,
             'operator_id', nullif(btrim(coalesce(_payload->>'operator_id', '')), ''),
             'supplier_name', nullif(btrim(coalesce(_payload->>'supplier_name', '')), ''),
             'commission_type', _commission_type,
             'commission_percent', nullif(btrim(coalesce(_payload->>'commission_percent', '')), '')::numeric,
             'commission_fixed', nullif(btrim(coalesce(_payload->>'commission_fixed', '')), '')::numeric,
             'non_commissionable_fees', coalesce(nullif(btrim(coalesce(_payload->>'non_commissionable_fees', '')), '')::numeric, 0),
             'payment_rule', _payment_rule,
             'payment_days', nullif(btrim(coalesce(_payload->>'payment_days', '')), '')::int,
             'requires_invoice', coalesce((_payload->>'requires_invoice')::boolean, false),
             'justification', nullif(btrim(coalesce(_payload->>'justification', '')), '')
           ),
         financial_rule_snapshot_at = now(),
         updated_at = now()
   WHERE s.id = _service_id;

  INSERT INTO public.travel_file_events (file_id, agency_id, event_type, actor_user_id, payload)
  VALUES (_service.file_id, _file.agency_id, 'service_financial_rule_set', auth.uid(),
          jsonb_build_object('service_id', _service_id,
                             'service_name', _service.product_name,
                             'status', _status,
                             'source', _source));
END;
$function$;

-- ============================================================
-- 6) RPC de confirmação: idempotência sob concorrência, vínculo
--    exclusivo por processo e tipos canônicos no financeiro
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_travel_file_sale(
  p_file_id uuid,
  p_idempotency_key text,
  p_acceptance jsonb DEFAULT '{}'::jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _file public.travel_files;
  _cmd public.workflow_commands;
  _hash text;
  _conv_key text := 'file:' || p_file_id::text;
  _operation_id uuid;
  _sale_id uuid;
  _cand record;
  _cand_count int;
  _eligible uuid[];
  _op_service_ids uuid[] := '{}';
  _os_id uuid;
  _service record;
  _currency text;
  _currency_count int;
  _total numeric := 0;
  _pos int := 0;
  _i int;
  _price numeric;
  _comm_type text;
  _comm_value numeric;
  _comm_sum numeric := 0;
  _closed_stage_id uuid;
  _client_name text;
  _channel text;
  _note text;
  _exceptions jsonb;
  _excluded int := 0;
  _created text[] := '{}';
  _reused text[] := '{}';
  _warnings text[] := '{}';
  _result jsonb;
  _first_time boolean;
  _is_package boolean;
  _opp_open boolean;
BEGIN
  _file := private.assert_travel_file_access(p_file_id, 'reservations.manage');

  IF NOT public.agency_has_entitlement(_file.agency_id, 'unified_workflow_v2') THEN
    RAISE EXCEPTION 'UNIFIED_WORKFLOW_DISABLED: O fluxo unificado de venda não está ativo para esta agência.';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED: a chave de idempotência é obrigatória.';
  END IF;

  _hash := md5(coalesce(p_acceptance::text, '') || '|' || coalesce(p_expected_updated_at::text, ''));

  -- Lock ANTES da decisão de replay: chamadas simultâneas com a mesma chave
  -- serializam aqui e a segunda relê workflow_commands já com o resultado da
  -- primeira (replay em vez de unique_violation).
  SELECT * INTO _file FROM public.travel_files WHERE id = p_file_id FOR UPDATE;

  SELECT * INTO _cmd FROM public.workflow_commands
   WHERE file_id = p_file_id AND command = 'confirm_sale' AND idempotency_key = p_idempotency_key;
  IF _cmd.id IS NOT NULL THEN
    IF _cmd.payload_hash <> _hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: esta chave de idempotência já foi usada com outros dados. Recarregue a tela e tente novamente.';
    END IF;
    RETURN _cmd.result || jsonb_build_object('replayed', true);
  END IF;

  _channel := NULLIF(btrim(coalesce(p_acceptance->>'channel', '')), '');
  _note := NULLIF(btrim(coalesce(p_acceptance->>'note', '')), '');
  IF _channel IS NULL OR _channel NOT IN ('whatsapp','telefone','email','presencial','site','outro') THEN
    RAISE EXCEPTION 'ACCEPTANCE_REQUIRED: informe o canal do aceite do cliente (whatsapp, telefone, email, presencial, site ou outro).';
  END IF;
  _exceptions := coalesce(p_acceptance->'supplier_exceptions', '{}'::jsonb);

  SELECT id INTO _operation_id FROM public.operations WHERE travel_file_id = p_file_id;
  SELECT id INTO _sale_id FROM public.sales WHERE travel_file_id = p_file_id;
  _first_time := _operation_id IS NULL;

  IF _first_time THEN
    IF p_expected_updated_at IS NOT NULL AND _file.updated_at <> p_expected_updated_at THEN
      RAISE EXCEPTION 'STALE_VERSION: Este processo foi alterado depois que a tela foi aberta. Recarregue e revise antes de confirmar.';
    END IF;
    IF _file.status <> 'awaiting_client' THEN
      RAISE EXCEPTION 'INVALID_STAGE: O processo precisa estar em "Aguardando cliente" para confirmar a venda.';
    END IF;
    IF _file.client_id IS NULL OR _file.opportunity_id IS NULL THEN
      RAISE EXCEPTION 'MISSING_LINKS: O processo precisa ter cliente e oportunidade vinculados.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.travel_file_services s
               WHERE s.file_id = p_file_id
                 AND s.status IN ('requested','reconfirming','amount_changed')) THEN
      RAISE EXCEPTION 'SERVICES_PENDING: Há serviços aguardando reconfirmação de preço ou disponibilidade. Reconfirme todos antes de confirmar a venda.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.travel_file_services s
               WHERE s.file_id = p_file_id AND s.is_required AND s.status = 'unavailable') THEN
      RAISE EXCEPTION 'REQUIRED_UNAVAILABLE: Há serviço obrigatório indisponível. Remova-o do pedido ou reconfirme antes de confirmar a venda.';
    END IF;
  END IF;

  -- ===== Vínculo exclusivo: nunca misturar processos diferentes =====
  IF EXISTS (SELECT 1 FROM public.operations o
             WHERE o.opportunity_id = _file.opportunity_id
               AND o.travel_file_id IS NOT NULL AND o.travel_file_id <> p_file_id)
     OR EXISTS (SELECT 1 FROM public.sales s
                WHERE s.opportunity_id = _file.opportunity_id
                  AND s.travel_file_id IS NOT NULL AND s.travel_file_id <> p_file_id) THEN
    RAISE EXCEPTION 'WORKFLOW_LINK_CONFLICT: Esta oportunidade já está vinculada a outro processo de reserva. Separe a oportunidade antes de confirmar esta venda.';
  END IF;

  -- Ambiguidade legada, verificada ANTES de qualquer escrita.
  IF _operation_id IS NULL THEN
    SELECT count(*) INTO _cand_count FROM public.operations o
     WHERE o.opportunity_id = _file.opportunity_id
       AND o.travel_file_id IS NULL
       AND o.user_id = _file.agency_id
       AND (o.client_id IS NULL OR o.client_id = _file.client_id);
    IF _cand_count > 1 THEN
      INSERT INTO public.booking_request_issues (request_id, agency_id, source, error_message, payload)
      VALUES (_file.current_request_id, _file.agency_id, 'legacy_ambiguous_link',
              'LEGACY_AMBIGUOUS_LINK: mais de uma operação legada elegível para a oportunidade.',
              jsonb_build_object('file_id', p_file_id, 'opportunity_id', _file.opportunity_id,
                                 'candidates', _cand_count, 'entity', 'operations'));
      RETURN jsonb_build_object(
        'error', 'LEGACY_AMBIGUOUS_LINK',
        'message', 'Esta oportunidade tem mais de uma operação antiga elegível. Revise no CRM qual operação pertence a este processo antes de confirmar a venda.',
        'entity', 'operations',
        'file_id', p_file_id,
        'opportunity_id', _file.opportunity_id,
        'replayed', false);
    END IF;
  END IF;

  IF _sale_id IS NULL THEN
    SELECT count(*) INTO _cand_count FROM public.sales s
     WHERE s.opportunity_id = _file.opportunity_id
       AND s.travel_file_id IS NULL
       AND s.user_id = _file.agency_id
       AND (s.client_id IS NULL OR s.client_id = _file.client_id);
    IF _cand_count > 1 THEN
      INSERT INTO public.booking_request_issues (request_id, agency_id, source, error_message, payload)
      VALUES (_file.current_request_id, _file.agency_id, 'legacy_ambiguous_link',
              'LEGACY_AMBIGUOUS_LINK: mais de uma venda legada elegível para a oportunidade.',
              jsonb_build_object('file_id', p_file_id, 'opportunity_id', _file.opportunity_id,
                                 'candidates', _cand_count, 'entity', 'sales'));
      RETURN jsonb_build_object(
        'error', 'LEGACY_AMBIGUOUS_LINK',
        'message', 'Esta oportunidade tem mais de uma venda antiga elegível. Revise no financeiro qual venda pertence a este processo antes de confirmar.',
        'entity', 'sales',
        'file_id', p_file_id,
        'opportunity_id', _file.opportunity_id,
        'replayed', false);
    END IF;
  END IF;

  SELECT array_agg(s.id ORDER BY s.created_at, s.id) INTO _eligible
  FROM public.travel_file_services s
  WHERE s.file_id = p_file_id
    AND s.status IN ('available','awaiting_client','booked','paid','issued','delivered')
    AND coalesce(s.sold_amount, s.reconfirmed_amount, s.requested_amount) > 0;

  IF _eligible IS NULL OR array_length(_eligible, 1) IS NULL THEN
    RAISE EXCEPTION 'NO_ELIGIBLE_SERVICES: Nenhum serviço elegível para conversão (disponível/reservado/etc. com preço final).';
  END IF;

  SELECT count(*) INTO _excluded
  FROM public.travel_file_services s
  WHERE s.file_id = p_file_id AND NOT s.is_required AND s.status IN ('unavailable','cancelled');
  IF _excluded > 0 THEN
    _warnings := _warnings || format('%s serviço(s) opcional(is) indisponível(is)/cancelado(s) ficaram fora da conversão.', _excluded);
  END IF;

  SELECT count(DISTINCT upper(s.currency)) INTO _currency_count
  FROM public.travel_file_services s WHERE s.id = ANY(_eligible);
  IF _currency_count > 1 THEN
    RAISE EXCEPTION 'MIXED_CURRENCIES: Os serviços elegíveis usam moedas diferentes. Separe a venda por moeda antes de confirmar.';
  END IF;
  SELECT upper(s.currency) INTO _currency
  FROM public.travel_file_services s WHERE s.id = ANY(_eligible) LIMIT 1;
  _currency := coalesce(_currency, 'BRL');

  IF EXISTS (SELECT 1 FROM public.travel_file_services s
             WHERE s.id = ANY(_eligible)
               AND coalesce(s.financial_rule_status, 'pending') = 'pending') THEN
    RAISE EXCEPTION 'FINANCIAL_RULE_PENDING: Há serviço sem regra financeira confirmada. Revise fornecedor e comissão de cada serviço antes de confirmar.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.travel_file_services s
             WHERE s.id = ANY(_eligible)
               AND s.operator_id IS NULL
               AND NULLIF(btrim(coalesce(s.supplier_name, '')), '') IS NULL
               AND NULLIF(btrim(coalesce(_exceptions->>s.id::text, '')), '') IS NULL) THEN
    RAISE EXCEPTION 'SUPPLIER_MISSING: Há serviço sem fornecedor identificado. Informe o fornecedor ou registre a justificativa da exceção.';
  END IF;

  SELECT coalesce(sum(coalesce(s.sold_amount, s.reconfirmed_amount, s.requested_amount)), 0)
    INTO _total
  FROM public.travel_file_services s WHERE s.id = ANY(_eligible);

  _is_package := _file.pricing_mode IN ('package','pacote');
  SELECT name INTO _client_name FROM public.clients WHERE id = _file.client_id;

  -- ===== Operação: criar ou reutilizar UMA (ambiguidade já checada) =====
  IF _operation_id IS NULL THEN
    SELECT o.* INTO _cand FROM public.operations o
     WHERE o.opportunity_id = _file.opportunity_id
       AND o.travel_file_id IS NULL
       AND o.user_id = _file.agency_id
       AND (o.client_id IS NULL OR o.client_id = _file.client_id)
     LIMIT 1;
    IF _cand.id IS NOT NULL THEN
      _operation_id := _cand.id;
      UPDATE public.operations
         SET travel_file_id = p_file_id,
             conversion_key = coalesce(conversion_key, _conv_key),
             flow_origin = coalesce(flow_origin, 'travel_file_v2'),
             client_id = coalesce(client_id, _file.client_id),
             quote_id = coalesce(quote_id, _file.quote_id),
             updated_at = now()
       WHERE id = _operation_id;
      _reused := _reused || 'operation';
      _warnings := _warnings || 'Operação existente da oportunidade foi reutilizada e vinculada ao processo.';
    END IF;
  ELSE
    _reused := _reused || 'operation';
  END IF;

  IF _operation_id IS NULL THEN
    BEGIN
      INSERT INTO public.operations (
        user_id, client_id, opportunity_id, quote_id, title, destination,
        travel_start_date, travel_end_date, passengers_count, sale_amount,
        stage, payment_status, customer_payment_status, supplier_payment_status,
        position, travel_file_id, conversion_key, flow_origin
      ) VALUES (
        _file.agency_id, _file.client_id, _file.opportunity_id, _file.quote_id,
        coalesce(_file.trip_name, _file.primary_destination, 'Viagem') || ' - ' || coalesce(_client_name, 'Cliente'),
        _file.primary_destination, _file.start_date, _file.end_date,
        greatest(coalesce(_file.passengers_count, 0), 0), _total,
        'venda_confirmada', 'pendente', 'pendente', 'pendente',
        0, p_file_id, _conv_key, 'travel_file_v2'
      )
      RETURNING id INTO _operation_id;
      _created := _created || 'operation';
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO _operation_id FROM public.operations
       WHERE travel_file_id = p_file_id
          OR (user_id = _file.agency_id AND conversion_key = _conv_key)
       ORDER BY created_at ASC LIMIT 1;
      _reused := _reused || 'operation';
    END;
  END IF;

  SELECT coalesce(max(position), 0) INTO _pos
  FROM public.operation_services WHERE operation_id = _operation_id;

  FOR _service IN
    SELECT * FROM public.travel_file_services s WHERE s.id = ANY(_eligible) ORDER BY s.created_at, s.id
  LOOP
    SELECT os.id INTO _os_id FROM public.operation_services os
     WHERE os.source_travel_file_service_id = _service.id;
    IF _os_id IS NULL THEN
      BEGIN
        _pos := _pos + 1;
        INSERT INTO public.operation_services (
          operation_id, user_id, source_travel_file_service_id,
          service_type, name, supplier, destination, start_date, end_date,
          amount, service_data, is_confirmed, is_paid, is_issued, is_delivered,
          position, notes
        ) VALUES (
          _operation_id, _file.agency_id, _service.id,
          coalesce(nullif(btrim(coalesce(_service.service_type, '')), ''), 'other'),
          coalesce(nullif(btrim(coalesce(_service.product_name, '')), ''), 'Serviço'),
          _service.supplier_name,
          coalesce(_service.destination, _service.city, _file.primary_destination),
          _service.start_date, _service.end_date,
          coalesce(_service.sold_amount, _service.reconfirmed_amount, _service.requested_amount),
          coalesce(_service.snapshot, '{}'::jsonb)
            || jsonb_build_object('currency', upper(coalesce(_service.currency, _currency)),
                                  'travel_file_service_id', _service.id),
          _service.status IN ('booked','paid','issued','delivered'),
          false,
          _service.status IN ('issued','delivered'),
          _service.status = 'delivered',
          _pos,
          format('Convertido do processo de reserva %s.', coalesce(_file.file_number_display, _file.file_number::text))
        )
        RETURNING id INTO _os_id;
        _created := _created || 'operation_service';
      EXCEPTION WHEN unique_violation THEN
        SELECT os.id INTO _os_id FROM public.operation_services os
         WHERE os.source_travel_file_service_id = _service.id;
        _reused := _reused || 'operation_service';
      END;
    ELSE
      _reused := _reused || 'operation_service';
    END IF;
    _op_service_ids := _op_service_ids || _os_id;
  END LOOP;

  -- ===== Venda financeira: criar ou reutilizar UMA (ambiguidade já checada) =====
  IF _sale_id IS NULL THEN
    SELECT s.* INTO _cand FROM public.sales s
     WHERE s.opportunity_id = _file.opportunity_id
       AND s.travel_file_id IS NULL
       AND s.user_id = _file.agency_id
       AND (s.client_id IS NULL OR s.client_id = _file.client_id)
     LIMIT 1;
    IF _cand.id IS NOT NULL THEN
      _sale_id := _cand.id;
      UPDATE public.sales
         SET travel_file_id = p_file_id,
             conversion_key = coalesce(conversion_key, _conv_key),
             flow_origin = coalesce(flow_origin, 'travel_file_v2'),
             client_id = coalesce(client_id, _file.client_id),
             source_operation_id = coalesce(source_operation_id, _operation_id),
             source_quote_id = coalesce(source_quote_id, _file.quote_id),
             updated_at = now()
       WHERE id = _sale_id;
      _reused := _reused || 'sale';
      _warnings := _warnings || 'Venda já existente da oportunidade foi reutilizada e vinculada ao processo.';
    END IF;
  ELSE
    _reused := _reused || 'sale';
  END IF;

  IF _sale_id IS NULL THEN
    BEGIN
      INSERT INTO public.sales (
        user_id, client_id, client_name, destination, sale_amount, opportunity_id,
        sale_date, travel_file_id, conversion_key, flow_origin,
        source_quote_id, source_operation_id, import_fingerprint
      ) VALUES (
        _file.agency_id, _file.client_id, coalesce(_client_name, 'Cliente'),
        _file.primary_destination, _total, _file.opportunity_id, CURRENT_DATE,
        p_file_id, _conv_key, 'travel_file_v2',
        _file.quote_id, _operation_id, _conv_key
      )
      RETURNING id INTO _sale_id;
      _created := _created || 'sale';
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO _sale_id FROM public.sales
       WHERE travel_file_id = p_file_id
          OR (user_id = _file.agency_id AND conversion_key = _conv_key)
       ORDER BY created_at ASC LIMIT 1;
      _reused := _reused || 'sale';
    END;
  END IF;

  -- ===== Produtos financeiros: tipos canônicos =====
  IF _is_package THEN
    SELECT coalesce(sum(
      CASE
        WHEN coalesce(s.financial_rule_status, 'pending') = 'not_applicable' THEN 0
        WHEN s.commission_type IN ('percentage','percent') AND s.commission_percent IS NOT NULL
          THEN coalesce(s.sold_amount, s.reconfirmed_amount, s.requested_amount) * s.commission_percent / 100
        WHEN s.commission_type = 'fixed' THEN coalesce(s.commission_fixed, s.commission_amount, 0)
        ELSE coalesce(s.commission_amount, 0)
      END), 0)
      INTO _comm_sum
    FROM public.travel_file_services s WHERE s.id = ANY(_eligible);

    IF NOT EXISTS (SELECT 1 FROM public.sale_products sp
                   WHERE sp.sale_id = _sale_id AND sp.source_kind = 'travel_file_package') THEN
      INSERT INTO public.sale_products (
        sale_id, user_id, product_type, description, sale_price, cost_price,
        commission_type, commission_value, source_kind, source_provenance
      )
      SELECT _sale_id, _file.agency_id, public.canonical_sale_product_type('pacote'),
             'Pacote - ' || coalesce(_file.trip_name, _file.primary_destination, 'Viagem'),
             _total,
             coalesce(sum(coalesce(s.cost_amount, 0)), 0),
             'fixed', _comm_sum,
             'travel_file_package',
             jsonb_build_object('travel_file_id', p_file_id,
                                'travel_file_service_ids', to_jsonb(_eligible),
                                'operation_id', _operation_id)
      FROM public.travel_file_services s WHERE s.id = ANY(_eligible);
      _created := _created || 'sale_product_package';
    ELSE
      _reused := _reused || 'sale_product_package';
    END IF;
  ELSE
    FOR _i IN 1 .. array_length(_eligible, 1) LOOP
      SELECT * INTO _service FROM public.travel_file_services s WHERE s.id = _eligible[_i];
      _price := coalesce(_service.sold_amount, _service.reconfirmed_amount, _service.requested_amount);
      _comm_type := 'fixed';
      _comm_value := 0;
      IF coalesce(_service.financial_rule_status, 'pending') = 'not_applicable' THEN
        _comm_type := 'fixed'; _comm_value := 0;
      ELSIF _service.commission_type IN ('percentage','percent') AND _service.commission_percent IS NOT NULL THEN
        _comm_type := 'percentage'; _comm_value := _service.commission_percent;
      ELSIF _service.commission_type = 'fixed' THEN
        _comm_type := 'fixed'; _comm_value := coalesce(_service.commission_fixed, _service.commission_amount, 0);
      ELSIF _service.commission_amount IS NOT NULL AND _service.commission_amount > 0 THEN
        _comm_type := 'fixed'; _comm_value := _service.commission_amount;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.sale_products sp
                     WHERE sp.source_travel_file_service_id = _service.id) THEN
        BEGIN
          INSERT INTO public.sale_products (
            sale_id, user_id, product_type, description, sale_price, cost_price,
            commission_type, commission_value, non_commissionable_taxes,
            supplier_name, payment_rule, payment_days, requires_invoice,
            source_travel_file_service_id, source_operation_service_id,
            source_kind, source_provenance
          ) VALUES (
            _sale_id, _file.agency_id,
            public.canonical_sale_product_type(_service.service_type),
            _service.product_name, _price, coalesce(_service.cost_amount, 0),
            _comm_type, _comm_value, coalesce(_service.non_commissionable_fees, 0),
            _service.supplier_name, _service.payment_rule, _service.payment_days,
            coalesce(_service.requires_invoice, false),
            _service.id, _op_service_ids[_i],
            'travel_file_service',
            jsonb_build_object('travel_file_id', p_file_id,
                               'travel_file_service_id', _service.id,
                               'operation_service_id', _op_service_ids[_i],
                               'operation_id', _operation_id,
                               'service_type_original', _service.service_type,
                               'financial_rule_snapshot', _service.financial_rule_snapshot)
          );
          _created := _created || 'sale_product';
        EXCEPTION WHEN unique_violation THEN
          _reused := _reused || 'sale_product';
        END;
      ELSE
        _reused := _reused || 'sale_product';
      END IF;
    END LOOP;
  END IF;

  SELECT coalesce(stage, '') <> 'closed' INTO _opp_open
  FROM public.opportunities WHERE id = _file.opportunity_id;
  IF coalesce(_opp_open, false) THEN
    SELECT id INTO _closed_stage_id FROM public.pipeline_stages
     WHERE user_id = _file.agency_id AND legacy_key = 'closed' LIMIT 1;
    UPDATE public.opportunities
       SET stage = 'closed',
           stage_id = coalesce(_closed_stage_id, stage_id),
           updated_at = now()
     WHERE id = _file.opportunity_id;
  END IF;

  IF _first_time THEN
    INSERT INTO public.travel_file_events (file_id, agency_id, event_type, actor_user_id, payload)
    VALUES (p_file_id, _file.agency_id, 'client_acceptance', auth.uid(),
            jsonb_build_object('channel', _channel, 'note', _note,
                               'accepted_at', now(), 'user_id', auth.uid()));

    UPDATE public.travel_files
       SET status = 'sale_confirmed', confirmed_at = coalesce(confirmed_at, now()), updated_at = now()
     WHERE id = p_file_id;
    INSERT INTO public.travel_file_events (file_id, agency_id, event_type, actor_user_id, payload)
    VALUES (p_file_id, _file.agency_id, 'file_status_changed', auth.uid(),
            jsonb_build_object('from', _file.status, 'to', 'sale_confirmed',
                               'reason', 'Aceite do cliente registrado (' || _channel || ')'));

    UPDATE public.travel_files
       SET status = 'in_operation',
           workflow_version = 2,
           final_sale_amount = _total,
           currency = _currency,
           operation_id = _operation_id,
           updated_at = now()
     WHERE id = p_file_id;
    INSERT INTO public.travel_file_events (file_id, agency_id, event_type, actor_user_id, payload)
    VALUES (p_file_id, _file.agency_id, 'file_status_changed', auth.uid(),
            jsonb_build_object('from', 'sale_confirmed', 'to', 'in_operation'));
    INSERT INTO public.travel_file_events (file_id, agency_id, event_type, actor_user_id, payload)
    VALUES (p_file_id, _file.agency_id, 'sale_converted', auth.uid(),
            jsonb_build_object('operation_id', _operation_id, 'sale_id', _sale_id,
                               'opportunity_id', _file.opportunity_id,
                               'total', _total, 'currency', _currency,
                               'services', array_length(_eligible, 1)));
  END IF;

  _result := jsonb_build_object(
    'file_id', p_file_id,
    'opportunity_id', _file.opportunity_id,
    'operation_id', _operation_id,
    'sale_id', _sale_id,
    'created', to_jsonb(_created),
    'reused', to_jsonb(_reused),
    'replayed', false,
    'warnings', to_jsonb(_warnings),
    'total', _total,
    'currency', _currency
  );

  -- Concorrência: a gravação do comando nunca pode vazar unique_violation.
  INSERT INTO public.workflow_commands (agency_id, file_id, command, idempotency_key, payload_hash, status, result)
  VALUES (_file.agency_id, p_file_id, 'confirm_sale', p_idempotency_key, _hash, 'completed', _result)
  ON CONFLICT (file_id, command, idempotency_key) DO NOTHING;

  RETURN _result;
END $function$;

COMMENT ON FUNCTION public.confirm_travel_file_sale(uuid, text, jsonb, timestamptz) IS
  'Confirmação transacional e idempotente da venda de um processo de reserva (fluxo unificado V2, exige entitlement unified_workflow_v2).';
