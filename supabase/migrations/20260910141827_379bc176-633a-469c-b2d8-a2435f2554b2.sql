-- =====================================================================
-- Central de Reservas — reauditoria: 2 blockers + histórico manual.
-- Aditivo e idempotente; nenhum snapshot armazenado é alterado.
-- =====================================================================

-- ---------- 1) leitura direta de serviços: helper seguro, nega por padrão ----------
-- Independe da RLS do pai (SECURITY DEFINER) e valida o escopo da agência.
-- Retorna TRUE só quando o pai existe, é do escopo do leitor e é de origem WEB.
CREATE OR REPLACE FUNCTION private.travel_file_direct_read_is_web(_file_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT COALESCE(f.origin, 'web_quote') <> 'manual'
       AND f.agency_id = ANY(private.agency_owner_ids())
      FROM public.travel_files f
     WHERE f.id = _file_id
  ), false)
$$;

REVOKE ALL ON FUNCTION private.travel_file_direct_read_is_web(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.travel_file_direct_read_is_web(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS travel_file_services_manual_direct_read_guard ON public.travel_file_services;
CREATE POLICY travel_file_services_manual_direct_read_guard
ON public.travel_file_services AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  private.travel_file_direct_read_is_web(file_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.can_team('financial.view_revenue')
      AND public.can_team('financial.view_margin')
      AND public.can_team('financial.commissions.view'))
);

-- ---------- 2) projeção EXPLÍCITA de snapshots/payloads ----------
-- Para leitores sem todas as permissões financeiras: mantém apenas campos
-- operacionais reconhecidos e, por categoria, os campos financeiros permitidos.
-- Qualquer chave desconhecida é omitida (negação por padrão).
CREATE OR REPLACE FUNCTION private.reservations_project(
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
  v_allowed text[];
  v_operational CONSTANT text[] := ARRAY[
    'id','service_id','file_id','agency_id','item_id','request_item_id','index','order','sort',
    'type','service_type','category','subcategory','kind','origin','source','provider',
    'status','stage','is_required','selected','confirmed','locale','language','timezone',
    'created_at','updated_at','event_type','actor_name','actor_type','label','reason','from','to',
    'name','full_name','title','product_name','description','summary','details','observations',
    'notes','note','internal_notes','instructions','remarks','terms','payment_terms_text',
    'inclusions','exclusions','includes','excludes','cancellation_policy','policy','deadline',
    'confirmation_code','locator','record_locator','reservation_code','voucher','voucher_code',
    'supplier_id','supplier_name','operator','operator_name','operator_id','airline','airline_name',
    'city','country','state','destination','destination_city','origin_city','address','region',
    'start_date','end_date','date','check_in','check_out','checkin','checkout','leg_date',
    'departure','arrival','departure_time','arrival_time','departure_date','arrival_date',
    'time','duration','nights','days','due_date',
    'quantity','qty','passengers','passengers_count','pax','adults','children','infants',
    'adults_count','children_count','infants_count','rooms','rooms_count','room_type','room_name',
    'board','board_type','meal_plan','regime','age','birth_date','document','document_number',
    'passport','nationality','gender','email','phone','whatsapp',
    'flight_number','flight','segments','legs','stops','cabin','class','baggage','seat','terminal',
    'hotel_name','hotel','category_stars','stars','transfer_type','vehicle','pickup','dropoff',
    'itinerary','items','services','activities','schedule','checklist',
    'currency','currency_code','pricing_mode','payment_status','notes_changed','snapshot_changed',
    'contact_changed','contractor_changed','requested_amount_changed','currency_changed'
  ];
  v_revenue_keys CONSTANT text[] := ARRAY[
    'requested_amount','reconfirmed_amount','sold_amount','final_sale_amount','sale_amount',
    'total_amount','amount','unit_amount','price','unit_price','total_price','adult_price',
    'child_price','infant_price','fees_amount','taxes_amount','tax','fees','subtotal',
    'total_estimated','items_sum','total_original','total_brl','total','discount','discount_amount',
    'payment_amount','installment_amount','installments_value','deposit_amount','balance_amount',
    'sold_from','sold_to','reconfirmed_from','reconfirmed_to','requested_from','requested_to',
    'amount_from','amount_to','total_from','total_to','exchange_rate','rate'
  ];
  v_margin_keys CONSTANT text[] := ARRAY[
    'cost_amount','cost','net_amount','net_price','supplier_cost','margin','margin_amount',
    'markup','markup_amount','cost_from','cost_to','margin_from','margin_to'
  ];
  v_commission_keys CONSTANT text[] := ARRAY[
    'commission_amount','commission','commission_percent','commission_rate','commission_value',
    'commission_from','commission_to'
  ];
BEGIN
  IF _data IS NULL THEN RETURN NULL; END IF;
  IF _revenue AND _margin AND _commission THEN RETURN _data; END IF;

  v_allowed := v_operational;
  IF _revenue THEN v_allowed := v_allowed || v_revenue_keys; END IF;
  IF _margin THEN v_allowed := v_allowed || v_margin_keys; END IF;
  IF _commission THEN v_allowed := v_allowed || v_commission_keys; END IF;

  IF jsonb_typeof(_data) = 'object' THEN
    v_out := '{}'::jsonb;
    FOR v_key, v_val IN SELECT * FROM jsonb_each(_data) LOOP
      CONTINUE WHEN NOT (lower(v_key) = ANY(v_allowed));
      v_out := v_out || jsonb_build_object(
        v_key,
        CASE WHEN jsonb_typeof(v_val) IN ('object','array')
             THEN private.reservations_project(v_val, _revenue, _margin, _commission)
             ELSE v_val END);
    END LOOP;
    RETURN v_out;
  ELSIF jsonb_typeof(_data) = 'array' THEN
    SELECT COALESCE(jsonb_agg(private.reservations_project(el, _revenue, _margin, _commission)), '[]'::jsonb)
      INTO v_out FROM jsonb_array_elements(_data) el;
    RETURN v_out;
  END IF;
  RETURN _data;
END $$;

REVOKE ALL ON FUNCTION private.reservations_project(jsonb, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.reservations_project(jsonb, boolean, boolean, boolean) TO authenticated, service_role;

-- ---------- 3) detalhe: colunas sanitizadas + JSON por projeção explícita ----------
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
  v_file_json := v_file_json
    || jsonb_strip_nulls(jsonb_build_object(
         'passengers_snapshot',
         private.reservations_project(v_file.passengers_snapshot, v_revenue, v_margin, v_commission),
         'contact_snapshot',
         private.reservations_project(v_file.contact_snapshot, v_revenue, v_margin, v_commission)));

  SELECT COALESCE(jsonb_agg(sp ORDER BY (sp->>'created_at')), '[]'::jsonb)
    INTO v_services
    FROM (
      SELECT private.reservations_redact(to_jsonb(s), v_revenue, v_margin, v_commission)
             || jsonb_strip_nulls(jsonb_build_object(
                  'snapshot',
                  private.reservations_project(s.snapshot, v_revenue, v_margin, v_commission),
                  'passengers_snapshot',
                  private.reservations_project(s.passengers_snapshot, v_revenue, v_margin, v_commission)))
             AS sp
        FROM public.travel_file_services s
       WHERE s.file_id = v_file.id
    ) proj;

  SELECT COALESCE(jsonb_agg(row_to_json(src)::jsonb - 'sort_at' ORDER BY src.sort_at), '[]'::jsonb)
    INTO v_events
    FROM (
      SELECT ev.id::text AS id, ev.event_type, ev.actor_type,
             NULL::text AS actor_name,
             private.reservations_project(COALESCE(ev.payload, '{}'::jsonb),
                                         v_revenue, v_margin, v_commission) AS payload,
             ev.created_at, ev.created_at AS sort_at
        FROM public.quote_booking_request_events ev
       WHERE COALESCE(v_file.current_request_id, v_file.root_request_id) IS NOT NULL
         AND ev.request_id = COALESCE(v_file.current_request_id, v_file.root_request_id)
      UNION ALL
      SELECT e.id::text AS id, e.event_type, 'agency'::text AS actor_type,
             e.actor_name,
             private.reservations_project(COALESCE(e.payload, '{}'::jsonb),
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

-- ---------- 4) histórico manual: moeda, valor solicitado e contato livre ----------
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
  IF COALESCE(NEW.origin, 'web_quote') <> 'manual' THEN RETURN NEW; END IF;

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
     OR NEW.contact_snapshot IS DISTINCT FROM OLD.contact_snapshot
     OR NEW.trip_name IS DISTINCT FROM OLD.trip_name
     OR NEW.primary_destination IS DISTINCT FROM OLD.primary_destination
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.adults_count IS DISTINCT FROM OLD.adults_count
     OR NEW.children_count IS DISTINCT FROM OLD.children_count
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.requested_amount IS DISTINCT FROM OLD.requested_amount
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
      'currency', CASE WHEN NEW.currency IS DISTINCT FROM OLD.currency THEN NEW.currency END,
      'currency_changed', CASE WHEN NEW.currency IS DISTINCT FROM OLD.currency THEN true END,
      'requested_amount_changed', CASE WHEN NEW.requested_amount IS DISTINCT FROM OLD.requested_amount THEN true END,
      'contractor_changed', CASE WHEN NEW.client_id IS DISTINCT FROM OLD.client_id
                                   OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN true END,
      'contact_changed', CASE WHEN NEW.contact_client_id IS DISTINCT FROM OLD.contact_client_id
                                OR NEW.contact_snapshot IS DISTINCT FROM OLD.contact_snapshot THEN true END
    ));
    INSERT INTO public.travel_file_events
      (file_id, agency_id, event_type, actor_user_id, actor_team_member_id, actor_name, payload)
    VALUES (NEW.id, NEW.agency_id, 'file_data_changed', auth.uid(), v_member, v_name, v_changes);
  END IF;

  RETURN NEW;
END $$;