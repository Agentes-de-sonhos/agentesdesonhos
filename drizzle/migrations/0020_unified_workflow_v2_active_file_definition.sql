-- Fase 1A (rodada final de correção).
-- 1) Definição única de "processo ativo": status NOT IN ('cancelled','trip_completed').
-- 2) auto_create_operation_on_close: 0 ativos = legado; 1 ativo exige operação
--    canônica DESSE file; 2+ ativos bloqueiam com MULTIPLE_ACTIVE_TRAVEL_FILES.
-- 3) confirm_travel_file_sale: sob os dois locks e antes de qualquer escrita, o
--    file atual precisa ser o ÚNICO ativo da oportunidade.

CREATE OR REPLACE FUNCTION public.travel_file_is_active(_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT coalesce(_status, '') NOT IN ('cancelled', 'trip_completed')
$function$;

COMMENT ON FUNCTION public.travel_file_is_active(text) IS
  'Processo de reserva ativo para o fluxo unificado: status fora de cancelled e trip_completed. Espelhado na interface (isActiveTravelFileStatus).';

CREATE OR REPLACE FUNCTION public.auto_create_operation_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
  existing_op RECORD;
  op_title TEXT;
  new_legacy TEXT;
  old_legacy TEXT;
  is_now_closed BOOLEAN := false;
  was_closed BOOLEAN := false;
  _v2 BOOLEAN := false;
  _file_count INT := 0;
  _active_file_id uuid;
  _linked_ok BOOLEAN := false;
  _foreign_link BOOLEAN := false;
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
    -- GUARD V2 PRIMEIRO: antes de qualquer reuso legado.
    _v2 := public.agency_has_entitlement(NEW.user_id, 'unified_workflow_v2');

    IF _v2 THEN
      SELECT count(*) INTO _file_count
      FROM public.travel_files tf
      WHERE tf.opportunity_id = NEW.id
        AND public.travel_file_is_active(tf.status);

      IF _file_count > 1 THEN
        RAISE EXCEPTION 'MULTIPLE_ACTIVE_TRAVEL_FILES: Esta oportunidade tem mais de um processo de reserva ativo. Revise os processos na Central de Reservas e mantenha apenas um ativo antes de fechar a venda.';
      END IF;

      IF _file_count = 1 THEN
        SELECT tf.id INTO _active_file_id
        FROM public.travel_files tf
        WHERE tf.opportunity_id = NEW.id
          AND public.travel_file_is_active(tf.status)
        LIMIT 1;

        SELECT EXISTS (
          SELECT 1
          FROM public.operations o
          WHERE o.opportunity_id = NEW.id
            AND o.travel_file_id = _active_file_id
            AND o.conversion_key = 'file:' || _active_file_id::text
        ) INTO _linked_ok;

        IF NOT _linked_ok THEN
          SELECT EXISTS (
            SELECT 1
            FROM public.operations o
            WHERE o.opportunity_id = NEW.id
              AND o.travel_file_id IS NOT NULL
              AND o.travel_file_id <> _active_file_id
          ) INTO _foreign_link;

          IF _foreign_link THEN
            RAISE EXCEPTION 'WORKFLOW_LINK_CONFLICT: Esta oportunidade já está ligada a outro processo de reserva. Revise os vínculos na Central de Reservas antes de confirmar a venda.';
          END IF;

          RAISE EXCEPTION 'USE_CONFIRM_SALE: Esta oportunidade tem um processo de reserva. Confirme a venda pela Central de Reservas, no botão "Confirmar venda e iniciar operação".';
        END IF;

        RETURN NEW;
      END IF;
      -- _file_count = 0: nenhum processo ativo, segue o caminho legado.
    END IF;

    -- Caminho legado (sem entitlement ou sem processo de reserva ativo).
    SELECT id, travel_file_id INTO existing_op FROM public.operations WHERE opportunity_id = NEW.id LIMIT 1;
    IF existing_op.id IS NOT NULL THEN
      IF existing_op.travel_file_id IS NULL THEN
        PERFORM public.import_booking_request_into_operation(existing_op.id);
      END IF;
      RETURN NEW;
    END IF;

    SELECT name INTO client_record FROM public.clients WHERE id = NEW.client_id;
    op_title := COALESCE(NEW.destination, 'Viagem') || ' - ' || COALESCE(client_record.name, 'Cliente');

    INSERT INTO public.operations (
      user_id, client_id, opportunity_id, title, destination,
      travel_start_date, travel_end_date, passengers_count, sale_amount,
      stage, payment_status, position, conversion_key, flow_origin
    ) VALUES (
      NEW.user_id, NEW.client_id, NEW.id, op_title, NEW.destination,
      NEW.start_date, NEW.end_date, NEW.passengers_count, NEW.estimated_value,
      'venda_confirmada', 'pendente', 0,
      'opportunity:' || NEW.id::text, 'legacy_close'
    );
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.auto_create_operation_on_close() IS
  'Guard do funil + criação legada da operação. Com unified_workflow_v2: 0 processos ativos = legado; 1 ativo exige operação canônica desse file; 2+ ativos bloqueiam com MULTIPLE_ACTIVE_TRAVEL_FILES.';

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
  _opp public.opportunities;
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
  _active_files int := 0;
BEGIN
  _file := private.assert_travel_file_access(p_file_id, 'reservations.manage');

  IF NOT public.agency_has_entitlement(_file.agency_id, 'unified_workflow_v2') THEN
    RAISE EXCEPTION 'UNIFIED_WORKFLOW_DISABLED: O fluxo unificado de venda não está ativo para esta agência.';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED: a chave de idempotência é obrigatória.';
  END IF;

  _hash := md5(coalesce(p_acceptance::text, '') || '|' || coalesce(p_expected_updated_at::text, ''));

  -- LOCK 1 (ordem determinística): o processo de reserva.
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

  IF _file.client_id IS NULL OR _file.opportunity_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_LINKS: O processo precisa ter cliente e oportunidade vinculados.';
  END IF;

  -- LOCK 2: a oportunidade.
  SELECT * INTO _opp FROM public.opportunities WHERE id = _file.opportunity_id FOR UPDATE;
  IF _opp.id IS NULL THEN
    RAISE EXCEPTION 'MISSING_LINKS: A oportunidade vinculada a este processo não existe mais.';
  END IF;
  IF _opp.user_id <> _file.agency_id THEN
    RAISE EXCEPTION 'WORKFLOW_LINK_CONFLICT: A oportunidade vinculada pertence a outra conta.';
  END IF;
  IF _opp.client_id IS NOT NULL AND _file.client_id IS NOT NULL AND _opp.client_id <> _file.client_id THEN
    RAISE EXCEPTION 'WORKFLOW_LINK_CONFLICT: A oportunidade vinculada é de outro cliente. Revise o vínculo antes de confirmar.';
  END IF;

  -- Processo ativo ÚNICO por oportunidade (mesmo predicado do trigger e da UI).
  IF NOT public.travel_file_is_active(_file.status) THEN
    RAISE EXCEPTION 'INVALID_STAGE: Este processo está encerrado (cancelado ou viagem concluída) e não pode confirmar venda.';
  END IF;
  SELECT count(*) INTO _active_files
  FROM public.travel_files tf
  WHERE tf.opportunity_id = _file.opportunity_id
    AND tf.id <> p_file_id
    AND public.travel_file_is_active(tf.status);
  IF _active_files > 0 THEN
    RAISE EXCEPTION 'MULTIPLE_ACTIVE_TRAVEL_FILES: Esta oportunidade tem mais de um processo de reserva ativo. Mantenha apenas um processo ativo na Central de Reservas antes de confirmar a venda.';
  END IF;

  -- Estado lido SOMENTE depois dos dois locks.
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

  -- Vínculo exclusivo, revalidado sob o lock da oportunidade.
  IF EXISTS (SELECT 1 FROM public.operations o
             WHERE o.opportunity_id = _file.opportunity_id
               AND o.travel_file_id IS NOT NULL AND o.travel_file_id <> p_file_id)
     OR EXISTS (SELECT 1 FROM public.sales s
                WHERE s.opportunity_id = _file.opportunity_id
                  AND s.travel_file_id IS NOT NULL AND s.travel_file_id <> p_file_id) THEN
    RAISE EXCEPTION 'WORKFLOW_LINK_CONFLICT: Esta oportunidade já está vinculada a outro processo de reserva. Separe a oportunidade antes de confirmar esta venda.';
  END IF;

  -- Ambiguidade legada, também revalidada sob o lock e antes de qualquer escrita.
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

  -- ===== Operação: criar ou reutilizar UMA =====
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

  -- ===== Venda financeira: criar ou reutilizar UMA =====
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

  -- ===== Produtos financeiros com tipo canônico =====
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

  IF coalesce(_opp.stage, '') <> 'closed' THEN
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

  INSERT INTO public.workflow_commands (agency_id, file_id, command, idempotency_key, payload_hash, status, result)
  VALUES (_file.agency_id, p_file_id, 'confirm_sale', p_idempotency_key, _hash, 'completed', _result)
  ON CONFLICT (file_id, command, idempotency_key) DO NOTHING;

  RETURN _result;
END $function$;

COMMENT ON FUNCTION public.confirm_travel_file_sale(uuid, text, jsonb, timestamptz) IS
  'Confirmação transacional e idempotente da venda de um processo de reserva (fluxo unificado V2). Locks: travel_files depois opportunities; sob os dois locks revalida vínculo exclusivo, ambiguidade legada e processo ativo único (MULTIPLE_ACTIVE_TRAVEL_FILES) antes de qualquer escrita.';