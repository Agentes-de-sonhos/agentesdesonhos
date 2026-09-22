-- Fase 1A (funções): RPC transacional confirm_travel_file_sale + triggers idempotentes.
-- Nenhum comportamento muda sem o entitlement 'unified_workflow_v2' (kill switch).

-- ============================================================
-- 1) Situação de recebimento do CLIENTE (nova ideia, separada)
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_operation_customer_payment_status(p_operation_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _op public.operations;
  _total numeric := 0;
  _paid numeric := 0;
BEGIN
  SELECT * INTO _op FROM public.operations WHERE id = p_operation_id;
  IF _op.id IS NULL THEN RETURN 'pendente'; END IF;

  -- Faturas ligadas à operação (direto, pelo orçamento ou pela oportunidade)
  SELECT COALESCE(sum(i.total_amount), 0), COALESCE(sum(i.total_amount - i.balance), 0)
    INTO _total, _paid
  FROM public.invoices i
  WHERE i.user_id = _op.user_id
    AND COALESCE(i.status, '') <> 'cancelled'
    AND (
      (i.source_type = 'operation' AND i.source_id = _op.id)
      OR (i.source_type = 'quote' AND i.source_id IS NOT NULL AND i.source_id = _op.quote_id)
      OR (i.source_type = 'opportunity' AND i.source_id IS NOT NULL AND i.source_id = _op.opportunity_id)
    );

  -- Sem fatura, o total de referência são as vendas ligadas à operação
  IF _total <= 0 THEN
    SELECT COALESCE(sum(s.sale_amount), 0) INTO _total
    FROM public.sales s
    WHERE s.user_id = _op.user_id
      AND (s.source_operation_id = _op.id
           OR (s.travel_file_id IS NOT NULL AND s.travel_file_id = _op.travel_file_id)
           OR (s.opportunity_id IS NOT NULL AND s.opportunity_id = _op.opportunity_id));
  END IF;

  -- Recebimentos diretos (customer_payments) ligados à operação ou às vendas dela
  SELECT _paid + COALESCE(sum(cp.amount), 0) INTO _paid
  FROM public.customer_payments cp
  WHERE cp.user_id = _op.user_id
    AND (
      (cp.source = 'operation' AND cp.source_id = _op.id)
      OR cp.sale_id IN (
        SELECT s.id FROM public.sales s
        WHERE s.user_id = _op.user_id
          AND (s.source_operation_id = _op.id
               OR (s.travel_file_id IS NOT NULL AND s.travel_file_id = _op.travel_file_id)
               OR (s.opportunity_id IS NOT NULL AND s.opportunity_id = _op.opportunity_id))
      )
    );

  IF _total <= 0 OR _paid <= 0 THEN RETURN 'pendente'; END IF;
  IF _paid >= _total THEN RETURN 'pago'; END IF;
  RETURN 'parcial';
END;
$function$;

-- ============================================================
-- 2) is_paid dos serviços alimenta SOMENTE o pagamento a fornecedores.
--    operations.payment_status segue como espelho de compatibilidade.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_operation_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _op uuid := COALESCE(NEW.operation_id, OLD.operation_id);
  _status text;
BEGIN
  _status := public.compute_operation_payment_status(_op);
  UPDATE public.operations
     SET supplier_payment_status = _status,
         payment_status = _status, -- espelho legado (compatibilidade)
         updated_at = now()
   WHERE id = _op
     AND (supplier_payment_status IS DISTINCT FROM _status OR payment_status IS DISTINCT FROM _status);
  RETURN NULL;
END;
$function$;

-- ============================================================
-- 3) Faturas alimentam SOMENTE o recebimento do cliente, com
--    recomputo em insert/update/delete (reversão segura).
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
  v_op_id uuid;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices
   WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF v_invoice.id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_payment_date := COALESCE(NEW.payment_date, OLD.payment_date, CURRENT_DATE)::timestamptz;

  -- 1) Bump client last_interaction_at when adding a payment (inalterado)
  IF TG_OP IN ('INSERT','UPDATE') AND v_invoice.client_id IS NOT NULL THEN
    UPDATE public.clients
       SET last_interaction_at = GREATEST(COALESCE(last_interaction_at, v_payment_date), v_payment_date)
     WHERE id = v_invoice.client_id
       AND user_id = v_invoice.user_id;
  END IF;

  -- 2) Recomputa a situação de recebimento do cliente nas operações ligadas.
  --    Nunca mais escreve em operations.payment_status (espelho do fornecedor).
  FOR v_op_id IN
    SELECT o.id FROM public.operations o
    WHERE o.user_id = v_invoice.user_id
      AND (
        (v_invoice.source_type = 'operation' AND o.id = v_invoice.source_id)
        OR (v_invoice.source_type = 'quote' AND o.quote_id = v_invoice.source_id)
        OR (v_invoice.source_type = 'opportunity' AND o.opportunity_id = v_invoice.source_id)
      )
  LOOP
    UPDATE public.operations
       SET customer_payment_status = public.compute_operation_customer_payment_status(v_op_id),
           updated_at = now()
     WHERE id = v_op_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================
-- 4) customer_payments também alimentam SOMENTE o recebimento do cliente
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_customer_payment_to_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_op_id uuid;
  v_sale public.sales%ROWTYPE;
BEGIN
  FOR v_op_id IN
    SELECT DISTINCT op_id FROM (
      SELECT cp.source_id AS op_id
      FROM (SELECT COALESCE(NEW.source, OLD.source) AS source,
                   COALESCE(NEW.source_id, OLD.source_id) AS source_id) cp
      WHERE cp.source = 'operation' AND cp.source_id IS NOT NULL
      UNION
      SELECT s.source_operation_id
      FROM public.sales s
      WHERE s.id = COALESCE(NEW.sale_id, OLD.sale_id) AND s.source_operation_id IS NOT NULL
      UNION
      SELECT o.id FROM public.operations o
      JOIN public.sales s ON s.id = COALESCE(NEW.sale_id, OLD.sale_id)
      WHERE (s.travel_file_id IS NOT NULL AND o.travel_file_id = s.travel_file_id)
         OR (s.opportunity_id IS NOT NULL AND o.opportunity_id = s.opportunity_id)
    ) ids
    WHERE op_id IS NOT NULL
  LOOP
    UPDATE public.operations
       SET customer_payment_status = public.compute_operation_customer_payment_status(v_op_id),
           updated_at = now()
     WHERE id = v_op_id;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_customer_payments_sync_operations ON public.customer_payments;
CREATE TRIGGER trg_customer_payments_sync_operations
AFTER INSERT OR UPDATE OR DELETE ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_payment_to_operations();

-- ============================================================
-- 5) Venda automática no fechamento: idempotente globalmente
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_opportunity_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
BEGIN
  IF NEW.stage = 'closed' AND (OLD.stage IS NULL OR OLD.stage != 'closed') THEN
    -- Idempotência global: nunca cria segunda venda para a mesma oportunidade,
    -- e nunca cria venda quando o fluxo unificado é o dono da conversão.
    IF NOT EXISTS (SELECT 1 FROM public.sales WHERE opportunity_id = NEW.id)
       AND NOT (
         public.agency_has_entitlement(NEW.user_id, 'unified_workflow_v2')
         AND EXISTS (SELECT 1 FROM public.travel_files tf
                     WHERE tf.opportunity_id = NEW.id AND tf.status <> 'cancelled')
       ) THEN
      SELECT * INTO client_record FROM public.clients WHERE id = NEW.client_id;
      INSERT INTO public.sales (
        user_id, client_id, client_name, destination, sale_amount, opportunity_id,
        sale_date, conversion_key, flow_origin
      ) VALUES (
        NEW.user_id, NEW.client_id, COALESCE(client_record.name, 'Cliente'),
        NEW.destination, NEW.estimated_value, NEW.id, CURRENT_DATE,
        'opportunity:' || NEW.id::text, 'legacy_close'
      );
    END IF;

    UPDATE public.clients
    SET status = 'cliente_ativo', updated_at = now()
    WHERE id = NEW.client_id AND status IN ('lead', 'em_negociacao');
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 6) Operação automática no fechamento: reusa o que existe e cede
--    a conversão à RPC quando há file com fluxo unificado
-- ============================================================
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
    SELECT id, travel_file_id INTO existing_op FROM public.operations WHERE opportunity_id = NEW.id LIMIT 1;
    IF existing_op.id IS NOT NULL THEN
      -- Operação reaproveitada: importa os serviços do pedido de reserva apenas
      -- no fluxo legado (sem vínculo com file V2).
      IF existing_op.travel_file_id IS NULL THEN
        PERFORM public.import_booking_request_into_operation(existing_op.id);
      END IF;
      RETURN NEW;
    END IF;

    -- Com o fluxo unificado ativo, o fechamento de oportunidade com processo de
    -- reserva só acontece pela Central (a RPC cria a operação antes de fechar).
    IF public.agency_has_entitlement(NEW.user_id, 'unified_workflow_v2')
       AND EXISTS (SELECT 1 FROM public.travel_files tf
                   WHERE tf.opportunity_id = NEW.id AND tf.status <> 'cancelled') THEN
      RAISE EXCEPTION 'USE_CONFIRM_SALE: Esta oportunidade tem um processo de reserva. Confirme a venda pela Central de Reservas, no botão "Confirmar venda e iniciar operação".';
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

-- ============================================================
-- 7) Importação legada do pedido de reserva: NO-OP no fluxo V2
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_import_booking_request_services()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.travel_file_id IS NOT NULL THEN
    RETURN NEW; -- fluxo unificado: serviços vêm de travel_file_services
  END IF;
  PERFORM public.import_booking_request_into_operation(NEW.id);
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 8) A solicitação do site nunca pode sumir
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_ensure_travel_file()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM public.ensure_travel_file(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.booking_request_issues (request_id, agency_id, source, error_message, payload)
    VALUES (NEW.id, NEW.agency_id, 'ensure_travel_file', SQLERRM,
            jsonb_build_object('quote_id', NEW.quote_id, 'protocol', NEW.protocol, 'sqlstate', SQLSTATE));
  END;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 9) Recálculo de sale_amount: um único comportamento
--    (trg_sync_sale_amount é o ativo; recalc_sale_amount vira NO-OP)
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_sale_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- DEPRECATED: mantida apenas para não quebrar o trigger trg_recalc_sale_amount;
  -- o recálculo ativo é trg_sync_sale_amount (mesma regra, um único UPDATE).
  RETURN COALESCE(NEW, OLD);
END;
$function$;