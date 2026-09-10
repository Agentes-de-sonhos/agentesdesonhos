-- Central de Reservas: histórico combinado e validação de fornecedor por agência.
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

  -- Histórico combinado: solicitações do site (intactas) + registros internos
  -- das reservas cadastradas na Central, em ordem cronológica única.
  SELECT COALESCE(jsonb_agg(row_to_json(src)::jsonb - 'sort_at' ORDER BY src.sort_at), '[]'::jsonb)
    INTO v_events
    FROM (
      SELECT ev.id::text AS id, ev.event_type, ev.actor_type,
             NULL::text AS actor_name,
             (COALESCE(ev.payload, '{}'::jsonb) - v_hidden) AS payload,
             ev.created_at, ev.created_at AS sort_at
        FROM public.quote_booking_request_events ev
       WHERE COALESCE(v_file.current_request_id, v_file.root_request_id) IS NOT NULL
         AND ev.request_id = COALESCE(v_file.current_request_id, v_file.root_request_id)
      UNION ALL
      SELECT e.id::text AS id, e.event_type, 'agency'::text AS actor_type,
             e.actor_name,
             (COALESCE(e.payload, '{}'::jsonb) - v_hidden) AS payload,
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
  -- Fornecedor: aceita catálogo público ou cadastro da própria agência.
  IF v_supplier IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tour_operators o
     WHERE o.id = v_supplier
       AND (o.user_id IS NULL OR o.user_id = v_file.agency_id)) THEN
    RAISE EXCEPTION 'Fornecedor não encontrado nesta agência.';
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
END $function$;

REVOKE ALL ON FUNCTION public.travel_file_service_manual_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_service_manual_save(jsonb) TO authenticated;
