-- Integração bidirecional: serviço da reserva <-> serviço da operação <-> produto financeiro.
-- Tudo aditivo: nenhuma função anterior é reescrita além da relaxação explícita
-- de travel_file_service_manual_save para permitir ACRESCENTAR serviços em
-- processos originados de orçamento (os serviços já existentes continuam
-- congelados no fluxo original).

-- 1) Ordem canônica das situações do serviço (nunca regride).
CREATE OR REPLACE FUNCTION private.travel_service_status_rank(_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(btrim(coalesce(_status, '')))
    WHEN 'cancelled' THEN -1
    WHEN 'requested' THEN 0
    WHEN 'reconfirming' THEN 1
    WHEN 'available' THEN 2
    WHEN 'amount_changed' THEN 2
    WHEN 'unavailable' THEN 2
    WHEN 'awaiting_client' THEN 3
    WHEN 'booked' THEN 4
    WHEN 'paid' THEN 5
    WHEN 'issued' THEN 6
    WHEN 'delivered' THEN 7
    ELSE 0
  END
$$;

-- 2) Totais derivados dos serviços (reserva, operação e venda).
CREATE OR REPLACE FUNCTION private.travel_service_refresh_totals(_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.travel_files f
     SET requested_amount = COALESCE((
           SELECT sum(COALESCE(s.requested_amount, 0))
             FROM public.travel_file_services s
            WHERE s.file_id = f.id AND s.status <> 'cancelled'), 0),
         final_sale_amount = (
           SELECT sum(COALESCE(s.sold_amount, s.reconfirmed_amount, s.requested_amount, 0))
             FROM public.travel_file_services s
            WHERE s.file_id = f.id AND s.status <> 'cancelled'),
         updated_at = now()
   WHERE f.id = _file_id;

  UPDATE public.operations o
     SET sale_amount = COALESCE((
           SELECT sum(COALESCE(os.amount, 0))
             FROM public.operation_services os
            WHERE os.operation_id = o.id), 0),
         updated_at = now()
   WHERE o.travel_file_id = _file_id;

  UPDATE public.sales sa
     SET sale_amount = COALESCE((
           SELECT sum(COALESCE(sp.sale_price, 0))
             FROM public.sale_products sp
            WHERE sp.sale_id = sa.id), 0),
         updated_at = now()
   WHERE sa.travel_file_id = _file_id;
END $$;

-- 3) Função única e transacional de materialização nos três módulos.
CREATE OR REPLACE FUNCTION public.travel_service_materialize(
  _file_service_id uuid DEFAULT NULL,
  _operation_service_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fs public.travel_file_services;
  v_os public.operation_services;
  v_file public.travel_files;
  v_op public.operations;
  v_sale public.sales;
  v_owners uuid[] := private.agency_owner_ids();
  v_status text;
  v_rank integer;
  v_price numeric;
  v_sp_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;

  IF _file_service_id IS NOT NULL THEN
    SELECT * INTO v_fs FROM public.travel_file_services WHERE id = _file_service_id;
    IF v_fs.id IS NULL THEN RAISE EXCEPTION 'Serviço da reserva não encontrado.'; END IF;
    SELECT * INTO v_file FROM public.travel_files WHERE id = v_fs.file_id FOR UPDATE;
  ELSIF _operation_service_id IS NOT NULL THEN
    SELECT * INTO v_os FROM public.operation_services WHERE id = _operation_service_id;
    IF v_os.id IS NULL THEN RAISE EXCEPTION 'Serviço da operação não encontrado.'; END IF;
    SELECT * INTO v_op FROM public.operations WHERE id = v_os.operation_id;
    IF v_op.id IS NULL OR NOT (v_op.user_id = ANY(v_owners)) THEN
      RAISE EXCEPTION 'Operação não encontrada.';
    END IF;
    IF v_op.travel_file_id IS NULL THEN
      -- Operação sem processo de reserva vinculado: nada a espelhar.
      RETURN jsonb_build_object('operation_service_id', v_os.id);
    END IF;
    SELECT * INTO v_file FROM public.travel_files WHERE id = v_op.travel_file_id FOR UPDATE;
    IF v_os.source_travel_file_service_id IS NOT NULL THEN
      SELECT * INTO v_fs FROM public.travel_file_services WHERE id = v_os.source_travel_file_service_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Informe o serviço a materializar.';
  END IF;

  IF v_file.id IS NULL OR NOT (v_file.agency_id = ANY(v_owners)) THEN
    RAISE EXCEPTION 'Processo de reserva não encontrado.';
  END IF;

  IF v_op.id IS NULL THEN
    SELECT * INTO v_op FROM public.operations
     WHERE travel_file_id = v_file.id ORDER BY created_at LIMIT 1;
  END IF;
  SELECT * INTO v_sale FROM public.sales
   WHERE travel_file_id = v_file.id ORDER BY created_at LIMIT 1;

  -- 3.1) Serviço da reserva (criado a partir do serviço operacional).
  IF v_fs.id IS NULL AND v_os.id IS NOT NULL THEN
    v_status := CASE
      WHEN v_os.is_delivered THEN 'delivered'
      WHEN v_os.is_issued THEN 'issued'
      WHEN v_os.is_paid THEN 'paid'
      WHEN v_os.is_confirmed THEN 'booked'
      ELSE 'requested' END;
    INSERT INTO public.travel_file_services (
      file_id, agency_id, service_type, product_name, supplier_name, destination,
      start_date, end_date, quantity, currency, requested_amount, reconfirmed_amount,
      sold_amount, is_required, status, snapshot
    ) VALUES (
      v_file.id, v_file.agency_id,
      COALESCE(NULLIF(btrim(v_os.service_type), ''), 'other'),
      COALESCE(NULLIF(btrim(v_os.name), ''), 'Serviço'),
      NULLIF(btrim(COALESCE(v_os.supplier, '')), ''),
      NULLIF(btrim(COALESCE(v_os.destination, '')), ''),
      v_os.start_date, v_os.end_date, 1, v_file.currency,
      COALESCE(v_os.amount, 0), COALESCE(v_os.amount, 0), COALESCE(v_os.amount, 0),
      false, v_status,
      jsonb_strip_nulls(jsonb_build_object(
        'origin', 'operation_service',
        'notes', NULLIF(btrim(COALESCE(v_os.notes, '')), '')))
    ) RETURNING * INTO v_fs;
    UPDATE public.operation_services
       SET source_travel_file_service_id = v_fs.id
     WHERE id = v_os.id;
    v_os.source_travel_file_service_id := v_fs.id;
  END IF;

  -- 3.2) Serviço da operação (criado a partir do serviço da reserva).
  IF v_os.id IS NULL AND v_op.id IS NOT NULL THEN
    SELECT * INTO v_os FROM public.operation_services
     WHERE source_travel_file_service_id = v_fs.id;
    IF v_os.id IS NULL THEN
      v_rank := private.travel_service_status_rank(v_fs.status);
      INSERT INTO public.operation_services (
        operation_id, user_id, source_travel_file_service_id, service_type, name,
        supplier, destination, start_date, end_date, amount, notes, service_data,
        is_confirmed, is_paid, is_issued, is_delivered, position
      ) VALUES (
        v_op.id, v_op.user_id, v_fs.id,
        COALESCE(NULLIF(btrim(v_fs.service_type), ''), 'other'),
        COALESCE(NULLIF(btrim(v_fs.product_name), ''), 'Serviço'),
        v_fs.supplier_name, COALESCE(v_fs.destination, v_fs.city),
        v_fs.start_date, v_fs.end_date,
        COALESCE(v_fs.sold_amount, v_fs.reconfirmed_amount, v_fs.requested_amount, 0),
        NULLIF(btrim(COALESCE(v_fs.snapshot->>'notes', '')), ''), '{}'::jsonb,
        v_rank >= 4, v_rank >= 5, v_rank >= 6, v_rank >= 7,
        COALESCE((SELECT count(*) FROM public.operation_services WHERE operation_id = v_op.id), 0)
      )
      ON CONFLICT (source_travel_file_service_id)
        WHERE source_travel_file_service_id IS NOT NULL
        DO NOTHING
      RETURNING * INTO v_os;
      IF v_os.id IS NULL THEN
        SELECT * INTO v_os FROM public.operation_services
         WHERE source_travel_file_service_id = v_fs.id;
      END IF;
    END IF;
  END IF;

  -- 3.3) Produto financeiro: nasce SEM custo/comissão, pendente de configuração.
  IF v_sale.id IS NOT NULL AND v_fs.id IS NOT NULL THEN
    SELECT id INTO v_sp_id FROM public.sale_products
     WHERE source_travel_file_service_id = v_fs.id;
    v_price := COALESCE(v_fs.sold_amount, v_fs.reconfirmed_amount, v_fs.requested_amount, 0);
    IF v_sp_id IS NULL AND v_price > 0 THEN
      INSERT INTO public.sale_products (
        sale_id, user_id, product_type, description, sale_price, cost_price,
        commission_type, commission_value, non_commissionable_taxes, supplier_name,
        commission_status, source_kind, source_service_id,
        source_travel_file_service_id, source_operation_service_id, source_provenance
      ) VALUES (
        v_sale.id, v_sale.user_id,
        public.canonical_sale_product_type(v_fs.service_type),
        COALESCE(NULLIF(btrim(v_fs.product_name), ''), 'Serviço'),
        v_price, 0, 'percentage', 0, 0, v_fs.supplier_name,
        'pending_configuration', 'travel_file_service', v_fs.id,
        v_fs.id, v_os.id,
        jsonb_build_object(
          'materialized_by', 'travel_service_materialize',
          'financial_configuration', 'pending')
      )
      ON CONFLICT (source_travel_file_service_id)
        WHERE source_travel_file_service_id IS NOT NULL
        DO NOTHING
      RETURNING id INTO v_sp_id;
      IF v_sp_id IS NULL THEN
        SELECT id INTO v_sp_id FROM public.sale_products
         WHERE source_travel_file_service_id = v_fs.id;
      END IF;
    ELSIF v_sp_id IS NOT NULL AND v_os.id IS NOT NULL THEN
      UPDATE public.sale_products
         SET source_operation_service_id = COALESCE(source_operation_service_id, v_os.id),
             updated_at = now()
       WHERE id = v_sp_id;
    END IF;
  END IF;

  PERFORM private.travel_service_refresh_totals(v_file.id);

  RETURN jsonb_build_object(
    'file_id', v_file.id,
    'file_service_id', v_fs.id,
    'operation_service_id', v_os.id,
    'sale_product_id', v_sp_id);
END $$;

GRANT EXECUTE ON FUNCTION public.travel_service_materialize(uuid, uuid) TO authenticated;

-- 4) Sincronização de situação: execução operacional -> reserva, sem regressão.
CREATE OR REPLACE FUNCTION public.operation_service_status_to_file()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_status text;
BEGIN
  IF NEW.source_travel_file_service_id IS NULL THEN RETURN NEW; END IF;
  v_status := CASE
    WHEN NEW.is_delivered THEN 'delivered'
    WHEN NEW.is_issued THEN 'issued'
    WHEN NEW.is_paid THEN 'paid'
    WHEN NEW.is_confirmed THEN 'booked'
    ELSE NULL END;
  IF v_status IS NULL THEN RETURN NEW; END IF;
  UPDATE public.travel_file_services s
     SET status = v_status
   WHERE s.id = NEW.source_travel_file_service_id
     AND s.status <> 'cancelled'
     AND private.travel_service_status_rank(v_status)
         > private.travel_service_status_rank(s.status);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_operation_service_status_to_file ON public.operation_services;
CREATE TRIGGER trg_operation_service_status_to_file
AFTER INSERT OR UPDATE OF is_confirmed, is_paid, is_issued, is_delivered,
  source_travel_file_service_id ON public.operation_services
FOR EACH ROW EXECUTE FUNCTION public.operation_service_status_to_file();

-- 5) Acrescentar serviço também em processos vindos do site.
--    Serviços JÁ EXISTENTES de solicitações web continuam congelados.
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
  v_manual_added boolean;
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

  -- Serviço acrescentado à mão pela agência (em qualquer origem de processo).
  v_manual_added := v_service.id IS NULL
    OR COALESCE(v_service.snapshot->>'origin','') IN ('manual','manual_added','operation_service');

  -- Serviços que vieram congelados da solicitação do site seguem intocados aqui.
  IF v_file.origin <> 'manual' AND NOT v_manual_added THEN
    RAISE EXCEPTION 'Os serviços desta reserva vêm da solicitação do site e não podem ser alterados aqui.';
  END IF;

  IF v_name IS NULL THEN RAISE EXCEPTION 'Informe o nome do serviço.'; END IF;

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
      requested_amount, reconfirmed_amount, sold_amount, is_required, status, snapshot
    ) VALUES (
      v_file.id, v_file.agency_id, v_type, v_name,
      NULLIF(btrim(COALESCE(_payload->>'supplier_name','')), ''), v_supplier,
      NULLIF(btrim(COALESCE(_payload->>'city','')), ''),
      NULLIF(btrim(COALESCE(_payload->>'destination','')), ''),
      NULLIF(btrim(COALESCE(_payload->>'country','')), ''),
      v_start, v_end, v_qty, v_currency,
      v_amount,
      -- O serviço acrescentado é sempre parte da viagem e sempre cobrado:
      -- em processo já vendido ele nasce com valor reconfirmado e vendido.
      CASE WHEN v_file.origin <> 'manual' THEN v_amount ELSE NULL END,
      CASE WHEN v_file.origin <> 'manual' THEN v_amount ELSE NULL END,
      false, v_status,
      jsonb_strip_nulls(jsonb_build_object(
        'origin', CASE WHEN v_file.origin = 'manual' THEN 'manual' ELSE 'manual_added' END,
        'notes', v_notes))
    ) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

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
         requested_amount = v_amount,
         status = v_status,
         snapshot = v_snapshot
   WHERE s.id = v_service.id;

  RETURN v_service.id;
END $function$;