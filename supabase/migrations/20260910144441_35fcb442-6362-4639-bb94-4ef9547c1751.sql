-- Totais por moeda derivados dos serviços, SOMENTE para apresentação/consulta.
-- Nada é gravado: travel_files.requested_amount e os snapshots seguem intactos.
CREATE OR REPLACE FUNCTION private.travel_file_manual_currency_totals(
  _file_id uuid,
  _fallback_currency text,
  _revenue boolean,
  _margin boolean,
  _commission boolean
) RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN NOT (_revenue OR _margin OR _commission) THEN '[]'::jsonb
    ELSE COALESCE((
      SELECT jsonb_agg(
               -- Projeção explícita: cada bloco financeiro depende da sua permissão.
               jsonb_build_object('currency', g.currency, 'services_count', g.services_count)
               || CASE WHEN _revenue THEN jsonb_build_object(
                    'requested', g.requested,
                    'reconfirmed', g.reconfirmed,
                    'sold', g.sold,
                    'variation', g.reconfirmed - g.requested)
                  ELSE '{}'::jsonb END
               || CASE WHEN _margin THEN jsonb_build_object('cost', g.cost) ELSE '{}'::jsonb END
               || CASE WHEN _commission THEN jsonb_build_object('commission', g.commission)
                  ELSE '{}'::jsonb END
               -- Margem exige receita: nunca calculada com venda removida como zero.
               || CASE WHEN _margin AND _revenue THEN jsonb_build_object('margin', g.sold - g.cost)
                  ELSE '{}'::jsonb END
               ORDER BY g.currency)
        FROM (
          SELECT upper(COALESCE(NULLIF(btrim(s.currency), ''), NULLIF(btrim(_fallback_currency), ''), 'BRL')) AS currency,
                 count(*)::int AS services_count,
                 sum(COALESCE(s.requested_amount, 0)) AS requested,
                 sum(COALESCE(s.reconfirmed_amount, s.requested_amount, 0)) AS reconfirmed,
                 sum(COALESCE(s.sold_amount, s.reconfirmed_amount, s.requested_amount, 0)) AS sold,
                 sum(COALESCE(s.cost_amount, 0)) AS cost,
                 sum(COALESCE(s.commission_amount, 0)) AS commission
            FROM public.travel_file_services s
           WHERE s.file_id = _file_id
             AND s.status <> 'cancelled'
           GROUP BY 1
        ) g
    ), '[]'::jsonb)
  END
$$;

REVOKE ALL ON FUNCTION private.travel_file_manual_currency_totals(uuid, text, boolean, boolean, boolean) FROM PUBLIC;

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

  -- Reserva manual: o valor efetivo vem dos serviços, agrupado por moeda.
  -- Solicitações web mantêm os valores congelados, sem recálculo.
  IF v_file.origin = 'manual' THEN
    v_file_json := v_file_json || jsonb_build_object(
      'manual_totals',
      private.travel_file_manual_currency_totals(v_file.id, v_file.currency,
                                                 v_revenue, v_margin, v_commission));
  END IF;

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

CREATE OR REPLACE FUNCTION public.travel_files_page(_search text DEFAULT NULL::text, _statuses text[] DEFAULT NULL::text[], _from date DEFAULT NULL::date, _to date DEFAULT NULL::date, _responsible uuid DEFAULT NULL::uuid, _unread boolean DEFAULT false, _page integer DEFAULT 1, _page_size integer DEFAULT 20, _sort text DEFAULT 'recent'::text)
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
  _margin boolean := public.can_team('financial.view_margin');
  _commission boolean := public.can_team('financial.commissions.view');
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
        -- Só reservas manuais recebem o agregado derivado dos serviços; ele já
        -- vem projetado conforme as permissões financeiras de quem consulta.
        CASE WHEN f.origin = 'manual'
             THEN private.travel_file_manual_currency_totals(f.id, f.currency,
                                                             _revenue, _margin, _commission)
             ELSE NULL::jsonb END AS manual_totals,
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
      'margin', _margin,
      'commission', _commission,
      'commission_manage', public.can_team('financial.commissions.manage'),
      'financial_manage', public.can_team('reservations.financial.manage')
    )
  );
END $function$;