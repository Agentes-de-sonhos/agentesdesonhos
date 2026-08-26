-- ─────────────────────────────────────────────────────────────
-- 1. Leitura da Central de Reservas exige reservations.view
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "agency_members_view_files" ON public.travel_files;
CREATE POLICY "agency_members_view_files" ON public.travel_files
FOR SELECT TO authenticated
USING (
  (public.is_agency_member(agency_id) AND public.can_team('reservations.view'))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "agency_members_view_file_services" ON public.travel_file_services;
CREATE POLICY "agency_members_view_file_services" ON public.travel_file_services
FOR SELECT TO authenticated
USING (
  (public.is_agency_member(agency_id) AND public.can_team('reservations.view'))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "agency_members_view_file_notes" ON public.travel_file_notes;
CREATE POLICY "agency_members_view_file_notes" ON public.travel_file_notes
FOR SELECT TO authenticated
USING (
  (public.is_agency_member(agency_id) AND public.can_team('reservations.view'))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Escritas críticas saem do frontend: somente funções seguras gravam.
DROP POLICY IF EXISTS "agency_members_update_files" ON public.travel_files;
DROP POLICY IF EXISTS "agency_members_update_file_services" ON public.travel_file_services;
DROP POLICY IF EXISTS "agency_members_insert_file_notes" ON public.travel_file_notes;
DROP POLICY IF EXISTS "authors_update_file_notes" ON public.travel_file_notes;
DROP POLICY IF EXISTS "authors_delete_file_notes" ON public.travel_file_notes;

-- ─────────────────────────────────────────────────────────────
-- 2. Helpers privados de escopo da agência
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.agency_owner_ids()
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base uuid;
  _ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN RETURN ARRAY[]::uuid[]; END IF;
  _base := public.user_agency_id(auth.uid());
  SELECT array_agg(DISTINCT m2.user_id)
    INTO _ids
    FROM public.agency_membership m1
    JOIN public.agency_membership m2 ON m2.agency_id = m1.agency_id
   WHERE m1.user_id = _base;
  _ids := COALESCE(_ids, ARRAY[]::uuid[]);
  IF NOT (_base = ANY(_ids)) THEN _ids := _ids || _base; END IF;
  RETURN _ids;
END $$;

REVOKE ALL ON FUNCTION private.agency_owner_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.agency_owner_ids() TO authenticated, service_role;

-- Membro da equipe do chamador (NULL quando master/proprietário).
CREATE OR REPLACE FUNCTION private.current_team_member_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id FROM public.agency_team_members m
   WHERE m.auth_user_id = auth.uid() AND m.status = 'active'
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.current_team_member_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_team_member_id() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. Central de Reservas: paginação e filtros no servidor
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.travel_files_page(
  _search text DEFAULT NULL,
  _statuses text[] DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _responsible uuid DEFAULT NULL,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20,
  _sort text DEFAULT 'recent'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owners uuid[] := private.agency_owner_ids();
  _limit integer := LEAST(GREATEST(COALESCE(_page_size, 20), 1), 100);
  _offset integer := GREATEST(COALESCE(_page, 1) - 1, 0) * LEAST(GREATEST(COALESCE(_page_size, 20), 1), 100);
  _q text := NULLIF(btrim(COALESCE(_search, '')), '');
  _revenue boolean := public.can_team('financial.view_revenue');
  _margin boolean := public.can_team('financial.view_margin');
  _commission boolean := public.can_team('financial.commissions.view');
  _total bigint := 0;
  _items jsonb := '[]'::jsonb;
  _counts jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF NOT public.can_team('reservations.view') THEN
    RAISE EXCEPTION 'Você não possui permissão para ver as reservas.';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _tf_match (id uuid) ON COMMIT DROP;
  DELETE FROM _tf_match;

  INSERT INTO _tf_match (id)
  SELECT f.id
    FROM public.travel_files f
    LEFT JOIN public.clients c ON c.id = f.client_id
   WHERE f.agency_id = ANY(_owners)
     AND (_statuses IS NULL OR array_length(_statuses, 1) IS NULL OR f.status = ANY(_statuses))
     AND (_from IS NULL OR COALESCE(f.start_date, f.end_date, f.opened_at::date) >= _from)
     AND (_to IS NULL OR COALESCE(f.start_date, f.end_date, f.opened_at::date) <= _to)
     AND (_responsible IS NULL OR f.responsible_team_member_id = _responsible
          OR f.operations_responsible_team_member_id = _responsible)
     AND (
       _q IS NULL
       OR f.file_number_display ILIKE '%' || _q || '%'
       OR f.file_number::text ILIKE '%' || _q || '%'
       OR COALESCE(f.primary_destination, '') ILIKE '%' || _q || '%'
       OR COALESCE(c.name, '') ILIKE '%' || _q || '%'
       OR EXISTS (
         SELECT 1 FROM public.travel_file_services s
          WHERE s.file_id = f.id
            AND (COALESCE(s.product_name, '') ILIKE '%' || _q || '%'
                 OR COALESCE(s.supplier_name, '') ILIKE '%' || _q || '%'
                 OR COALESCE(s.destination, '') ILIKE '%' || _q || '%')
       )
     );

  SELECT count(*) INTO _total FROM _tf_match;

  SELECT COALESCE(jsonb_agg(row ORDER BY ord), '[]'::jsonb) INTO _items
  FROM (
    SELECT
      row_number() OVER () AS ord,
      to_jsonb(x) - CASE WHEN _revenue THEN '{}'::text[] ELSE ARRAY['requested_amount','reconfirmed_amount','final_sale_amount'] END AS row
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
        c.name AS client_name,
        COALESCE(sv.services_count, 0)::int AS services_count,
        COALESCE(sv.service_names, ARRAY[]::text[]) AS service_names,
        NOT EXISTS (
          SELECT 1 FROM public.travel_file_views v
           WHERE v.file_id = f.id AND v.user_id = auth.uid()
        ) AS unread,
        tm.full_name AS responsible_name,
        tmo.full_name AS operations_responsible_name
      FROM public.travel_files f
      JOIN _tf_match mt ON mt.id = f.id
      LEFT JOIN public.clients c ON c.id = f.client_id
      LEFT JOIN public.agency_team_members tm ON tm.id = f.responsible_team_member_id
      LEFT JOIN public.agency_team_members tmo ON tmo.id = f.operations_responsible_team_member_id
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS services_count,
               (array_agg(s.product_name ORDER BY s.created_at))[1:6] AS service_names
          FROM public.travel_file_services s WHERE s.file_id = f.id
      ) sv ON true
      ORDER BY
        CASE WHEN COALESCE(_sort, 'recent') = 'oldest' THEN f.opened_at END ASC,
        CASE WHEN COALESCE(_sort, 'recent') = 'travel' THEN f.start_date END ASC,
        CASE WHEN COALESCE(_sort, 'recent') NOT IN ('oldest', 'travel') THEN f.created_at END DESC,
        f.created_at DESC
      LIMIT _limit OFFSET _offset
    ) x
  ) y;

  SELECT jsonb_build_object(
    'all', count(*),
    'new', count(*) FILTER (WHERE f.status = 'request_received'),
    'awaiting_reconfirmation', count(*) FILTER (WHERE f.status IN ('awaiting_reconfirmation','partially_available')),
    'awaiting_client', count(*) FILTER (WHERE f.status = 'awaiting_client'),
    'confirmed', count(*) FILTER (WHERE f.status = 'sale_confirmed'),
    'in_operation', count(*) FILTER (WHERE f.status = 'in_operation'),
    'completed', count(*) FILTER (WHERE f.status = 'trip_completed'),
    'cancelled', count(*) FILTER (WHERE f.status = 'cancelled'),
    'overdue', count(*) FILTER (
      WHERE f.status NOT IN ('sale_confirmed','trip_completed','cancelled')
        AND f.opened_at <= now() - interval '2 days'
    ),
    'unread', count(*) FILTER (
      WHERE NOT EXISTS (SELECT 1 FROM public.travel_file_views v WHERE v.file_id = f.id AND v.user_id = auth.uid())
    )
  ) INTO _counts
  FROM public.travel_files f
  WHERE f.agency_id = ANY(_owners);

  RETURN jsonb_build_object(
    'total', _total,
    'page', GREATEST(COALESCE(_page, 1), 1),
    'page_size', _limit,
    'items', _items,
    'counts', _counts,
    'can', jsonb_build_object(
      'manage', public.can_team('reservations.manage'),
      'assign', public.can_team('reservations.assign'),
      'revenue', _revenue,
      'margin', _margin,
      'commission', _commission,
      'commission_manage', public.can_team('financial.commissions.manage')
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.travel_files_page(text, text[], date, date, uuid, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_files_page(text, text[], date, date, uuid, integer, integer, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. Escritas seguras do File
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.assert_travel_file_access(_file_id uuid, _permission text)
RETURNS public.travel_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _file public.travel_files;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF NOT public.can_team('reservations.view') OR NOT public.can_team(_permission) THEN
    RAISE EXCEPTION 'Você não possui permissão para executar esta ação.';
  END IF;
  SELECT * INTO _file FROM public.travel_files WHERE id = _file_id;
  IF _file.id IS NULL THEN RAISE EXCEPTION 'Processo de reserva não encontrado.'; END IF;
  IF NOT (_file.agency_id = ANY(private.agency_owner_ids())) THEN
    RAISE EXCEPTION 'Processo de reserva não encontrado.';
  END IF;
  RETURN _file;
END $$;

REVOKE ALL ON FUNCTION private.assert_travel_file_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_travel_file_access(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_set_status(
  _file_id uuid,
  _status text,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _file public.travel_files;
  _clean_reason text := NULLIF(btrim(COALESCE(_reason, '')), '');
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.manage');

  IF _status NOT IN ('request_received','awaiting_reconfirmation','partially_available',
                     'awaiting_client','sale_confirmed','in_operation','trip_completed','cancelled') THEN
    RAISE EXCEPTION 'Etapa inválida.';
  END IF;
  IF _status = 'cancelled' AND _clean_reason IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.';
  END IF;

  UPDATE public.travel_files f
     SET status = _status,
         cancellation_reason = CASE WHEN _status = 'cancelled' THEN left(_clean_reason, 1000) ELSE f.cancellation_reason END,
         cancelled_at = CASE WHEN _status = 'cancelled' THEN COALESCE(f.cancelled_at, now()) ELSE f.cancelled_at END,
         confirmed_at = CASE WHEN _status = 'sale_confirmed' THEN COALESCE(f.confirmed_at, now()) ELSE f.confirmed_at END,
         completed_at = CASE WHEN _status = 'trip_completed' THEN COALESCE(f.completed_at, now()) ELSE f.completed_at END,
         updated_at = now()
   WHERE f.id = _file.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_set_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_file_set_status(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_set_responsibles(
  _file_id uuid,
  _commercial uuid DEFAULT NULL,
  _operations uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _file public.travel_files;
  _owners uuid[];
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.assign');
  _owners := private.agency_owner_ids();

  IF _commercial IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.agency_team_members m
     WHERE m.id = _commercial AND m.agency_id = ANY(_owners)
  ) THEN
    RAISE EXCEPTION 'Colaborador inválido.';
  END IF;
  IF _operations IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.agency_team_members m
     WHERE m.id = _operations AND m.agency_id = ANY(_owners)
  ) THEN
    RAISE EXCEPTION 'Colaborador inválido.';
  END IF;

  UPDATE public.travel_files
     SET responsible_team_member_id = _commercial,
         operations_responsible_team_member_id = _operations,
         updated_at = now()
   WHERE id = _file.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_set_responsibles(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_file_set_responsibles(uuid, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_service_save(
  _service_id uuid,
  _status text DEFAULT NULL,
  _reconfirmed_amount numeric DEFAULT NULL,
  _sold_amount numeric DEFAULT NULL,
  _cost_amount numeric DEFAULT NULL,
  _commission_amount numeric DEFAULT NULL,
  _responsible uuid DEFAULT NULL,
  _touch_financials boolean DEFAULT false,
  _touch_responsible boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _svc public.travel_file_services;
  _file public.travel_files;
BEGIN
  SELECT * INTO _svc FROM public.travel_file_services WHERE id = _service_id;
  IF _svc.id IS NULL THEN RAISE EXCEPTION 'Serviço não encontrado.'; END IF;
  _file := private.assert_travel_file_access(_svc.file_id, 'reservations.manage');

  IF _status IS NOT NULL AND _status NOT IN ('requested','reconfirming','available','amount_changed',
      'unavailable','awaiting_client','booked','paid','issued','delivered','cancelled') THEN
    RAISE EXCEPTION 'Situação de serviço inválida.';
  END IF;

  IF _touch_financials THEN
    IF (_reconfirmed_amount IS NOT NULL OR _sold_amount IS NOT NULL)
       AND NOT public.can_team('financial.view_revenue') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar valores de venda.';
    END IF;
    IF _cost_amount IS NOT NULL AND NOT public.can_team('financial.view_margin') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar custos.';
    END IF;
    IF _commission_amount IS NOT NULL AND NOT public.can_team('financial.commissions.manage') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar comissões.';
    END IF;
  END IF;

  IF _touch_responsible AND NOT public.can_team('reservations.assign') THEN
    RAISE EXCEPTION 'Você não possui permissão para definir responsáveis.';
  END IF;

  UPDATE public.travel_file_services s
     SET status = COALESCE(_status, s.status),
         reconfirmed_amount = CASE WHEN _touch_financials THEN _reconfirmed_amount ELSE s.reconfirmed_amount END,
         sold_amount = CASE WHEN _touch_financials THEN _sold_amount ELSE s.sold_amount END,
         cost_amount = CASE WHEN _touch_financials THEN _cost_amount ELSE s.cost_amount END,
         commission_amount = CASE WHEN _touch_financials THEN _commission_amount ELSE s.commission_amount END,
         responsible_team_member_id = CASE WHEN _touch_responsible THEN _responsible ELSE s.responsible_team_member_id END,
         updated_at = now()
   WHERE s.id = _svc.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_service_save(uuid, text, numeric, numeric, numeric, numeric, uuid, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_file_service_save(uuid, text, numeric, numeric, numeric, numeric, uuid, boolean, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_note_add(_file_id uuid, _body text, _author_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _file public.travel_files;
  _clean text := NULLIF(btrim(COALESCE(_body, '')), '');
  _id uuid;
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.manage');
  IF _clean IS NULL THEN RAISE EXCEPTION 'Escreva a nota antes de salvar.'; END IF;

  INSERT INTO public.travel_file_notes (file_id, agency_id, author_user_id, author_team_member_id, author_name, body)
  VALUES (_file.id, _file.agency_id, auth.uid(), private.current_team_member_id(),
          NULLIF(btrim(COALESCE(_author_name, '')), ''), left(_clean, 4000))
  RETURNING id INTO _id;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_note_add(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_file_note_add(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_note_delete(_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _note public.travel_file_notes;
BEGIN
  SELECT * INTO _note FROM public.travel_file_notes WHERE id = _note_id;
  IF _note.id IS NULL THEN RAISE EXCEPTION 'Nota não encontrada.'; END IF;
  PERFORM private.assert_travel_file_access(_note.file_id, 'reservations.manage');
  IF _note.author_user_id IS DISTINCT FROM auth.uid() AND private.current_team_member_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Somente o autor pode excluir esta nota.';
  END IF;
  DELETE FROM public.travel_file_notes WHERE id = _note.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_note_delete(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_file_note_delete(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Painel administrativo white label: resumo operacional
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_agency_admin_dashboard(_time_zone text DEFAULT 'America/Sao_Paulo')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owners uuid[] := private.agency_owner_ids();
  _tz text := COALESCE(NULLIF(btrim(COALESCE(_time_zone, '')), ''), 'America/Sao_Paulo');
  _today date;
  _can_res boolean := public.can_team('reservations.view');
  _can_opp boolean := public.can_team('opportunities.view');
  _can_ops boolean := public.can_team('operations.view');
  _can_quotes boolean := public.can_team('quotes.view');
  _can_itin boolean := public.can_team('itineraries.view');
  _can_wallet boolean := public.can_team('wallet.view');
  _can_agenda boolean := public.can_team('agenda.view');
  _can_trips boolean := public.can_team('trips.view');
  _attention jsonb := '[]'::jsonb;
  _agenda jsonb := '[]'::jsonb;
  _followups jsonb := '[]'::jsonb;
  _trips jsonb := '[]'::jsonb;
  _recent jsonb := '[]'::jsonb;
  _counters jsonb := '{}'::jsonb;
  _attention_total integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  BEGIN
    _today := (now() AT TIME ZONE _tz)::date;
  EXCEPTION WHEN OTHERS THEN
    _tz := 'America/Sao_Paulo';
    _today := (now() AT TIME ZONE _tz)::date;
  END;

  -- Pendências (sem valores financeiros)
  WITH items AS (
    -- Reservas novas e paradas
    SELECT 'reservation'::text AS kind,
           f.id::text AS id,
           COALESCE(c.name, f.primary_destination, 'Solicitação de reserva') AS title,
           f.file_number_display AS subtitle,
           CASE WHEN f.opened_at <= now() - interval '2 days'
                THEN 'Solicitação parada há ' || GREATEST(0, floor(extract(epoch FROM now() - f.opened_at) / 86400))::int || ' dias'
                ELSE 'Nova solicitação de reserva' END AS reason,
           CASE WHEN f.opened_at <= now() - interval '2 days' THEN 1 ELSE 2 END AS priority,
           f.opened_at AS due_at,
           tm.full_name AS responsible_name
      FROM public.travel_files f
      LEFT JOIN public.clients c ON c.id = f.client_id
      LEFT JOIN public.agency_team_members tm ON tm.id = f.responsible_team_member_id
     WHERE _can_res
       AND f.agency_id = ANY(_owners)
       AND f.status NOT IN ('sale_confirmed','trip_completed','cancelled')
       AND (f.status = 'request_received' OR f.opened_at <= now() - interval '2 days')

    UNION ALL
    -- Follow-ups vencidos e de hoje
    SELECT 'followup',
           fu.opportunity_id::text,
           COALESCE(c.name, o.destination, 'Oportunidade'),
           COALESCE(o.destination, ''),
           CASE WHEN fu.follow_up_date < _today
                THEN 'Follow-up vencido em ' || to_char(fu.follow_up_date, 'DD/MM/YYYY')
                ELSE 'Follow-up para hoje' END,
           CASE WHEN fu.follow_up_date < _today THEN 1 ELSE 3 END,
           fu.follow_up_date::timestamptz,
           tm.full_name
      FROM public.opportunity_followups fu
      JOIN public.opportunities o ON o.id = fu.opportunity_id
      LEFT JOIN public.clients c ON c.id = o.client_id
      LEFT JOIN public.agency_team_members tm ON tm.id = o.assigned_team_member_id
     WHERE _can_opp
       AND o.user_id = ANY(_owners)
       AND o.stage NOT IN ('closed','lost')
       AND fu.follow_up_date IS NOT NULL
       AND fu.follow_up_date <= _today

    UNION ALL
    -- Orçamentos ainda em rascunho
    SELECT 'quote',
           q.id::text,
           COALESCE(NULLIF(q.trip_title, ''), q.client_name, q.destination, 'Orçamento'),
           COALESCE(q.destination, ''),
           'Orçamento em rascunho',
           4,
           q.updated_at,
           NULL
      FROM public.quotes q
     WHERE _can_quotes
       AND q.user_id = ANY(_owners)
       AND (COALESCE(q.status, 'draft') = 'draft' OR q.public_access_code IS NULL)

    UNION ALL
    -- Oportunidades sem próxima ação definida
    SELECT 'opportunity',
           o.id::text,
           COALESCE(c.name, o.destination, 'Oportunidade'),
           COALESCE(o.destination, ''),
           'Sem próxima ação definida',
           5,
           o.updated_at,
           tm.full_name
      FROM public.opportunities o
      LEFT JOIN public.clients c ON c.id = o.client_id
      LEFT JOIN public.agency_team_members tm ON tm.id = o.assigned_team_member_id
     WHERE _can_opp
       AND o.user_id = ANY(_owners)
       AND o.stage NOT IN ('closed','lost')
       AND o.follow_up_date IS NULL
       AND o.follow_up_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.opportunity_followups fu2
          WHERE fu2.opportunity_id = o.id AND fu2.follow_up_date >= _today
       )
  ), ranked AS (
    SELECT DISTINCT ON (kind, id) * FROM items ORDER BY kind, id, priority
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.priority, t.due_at NULLS LAST), '[]'::jsonb),
         (SELECT count(*)::int FROM ranked)
    INTO _attention, _attention_total
  FROM (SELECT * FROM ranked ORDER BY priority, due_at NULLS LAST LIMIT 6) t;

  -- Agenda de hoje
  IF _can_agenda THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.event_time NULLS LAST), '[]'::jsonb) INTO _agenda
    FROM (
      SELECT e.id::text AS id, e.title, e.event_type, e.event_date, e.event_time, e.all_day
        FROM public.agency_events e
       WHERE e.user_id = ANY(_owners)
         AND e.deleted_at IS NULL
         AND e.event_date = _today
       ORDER BY e.event_time NULLS LAST
       LIMIT 5
    ) t;
  END IF;

  -- Follow-ups do dia e vencidos (bloco Meu dia)
  IF _can_opp THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.follow_up_date), '[]'::jsonb) INTO _followups
    FROM (
      SELECT DISTINCT ON (fu.opportunity_id)
             fu.id::text AS id,
             fu.opportunity_id::text AS opportunity_id,
             fu.follow_up_date,
             COALESCE(c.name, o.destination, 'Oportunidade') AS client_name,
             o.destination,
             tm.full_name AS responsible_name,
             (fu.follow_up_date < _today) AS overdue
        FROM public.opportunity_followups fu
        JOIN public.opportunities o ON o.id = fu.opportunity_id
        LEFT JOIN public.clients c ON c.id = o.client_id
        LEFT JOIN public.agency_team_members tm ON tm.id = o.assigned_team_member_id
       WHERE o.user_id = ANY(_owners)
         AND o.stage NOT IN ('closed','lost')
         AND fu.follow_up_date IS NOT NULL
         AND fu.follow_up_date <= _today
       ORDER BY fu.opportunity_id, fu.follow_up_date
       LIMIT 5
    ) t;
  END IF;

  -- Próximas viagens
  IF _can_trips THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.start_date), '[]'::jsonb) INTO _trips
    FROM (
      SELECT tr.id::text AS id,
             COALESCE(tr.client_name, c.name) AS client_name,
             tr.destination,
             tr.trip_title,
             tr.start_date,
             tr.end_date,
             (tr.start_date - _today) AS days_remaining
        FROM public.trips tr
        LEFT JOIN public.clients c ON c.id = tr.client_id
       WHERE tr.user_id = ANY(_owners)
         AND COALESCE(tr.end_date, tr.start_date) >= _today
         AND lower(COALESCE(tr.status, '')) NOT IN ('archived','cancelado','cancelled','canceled','concluido','concluído','completed')
       ORDER BY tr.start_date
       LIMIT 5
    ) t;
  END IF;

  -- Continue de onde parou
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.updated_at DESC), '[]'::jsonb) INTO _recent
  FROM (
    SELECT 'quote'::text AS kind, q.id::text AS id,
           COALESCE(NULLIF(q.trip_title, ''), q.client_name, q.destination, 'Orçamento') AS title,
           q.destination AS subtitle, COALESCE(q.status, 'draft') AS status, q.updated_at,
           NULL::text AS responsible_name
      FROM public.quotes q WHERE _can_quotes AND q.user_id = ANY(_owners)
    UNION ALL
    SELECT 'itinerary', i.id::text,
           COALESCE(NULLIF(i.headline, ''), i.destination, 'Roteiro'), i.destination,
           COALESCE(i.status, 'draft'), i.updated_at, NULL
      FROM public.itineraries i WHERE _can_itin AND i.user_id = ANY(_owners)
    UNION ALL
    SELECT 'wallet', tr.id::text,
           COALESCE(NULLIF(tr.trip_title, ''), tr.client_name, tr.destination, 'Carteira digital'),
           tr.destination, COALESCE(tr.status, 'draft'), tr.updated_at, NULL
      FROM public.trips tr WHERE _can_wallet AND tr.user_id = ANY(_owners)
    UNION ALL
    SELECT 'opportunity', o.id::text,
           COALESCE(c.name, o.destination, 'Oportunidade'), o.destination, o.stage, o.updated_at,
           tm.full_name
      FROM public.opportunities o
      LEFT JOIN public.clients c ON c.id = o.client_id
      LEFT JOIN public.agency_team_members tm ON tm.id = o.assigned_team_member_id
     WHERE _can_opp AND o.user_id = ANY(_owners) AND o.stage NOT IN ('closed','lost')
    UNION ALL
    SELECT 'operation', op.id::text,
           COALESCE(NULLIF(op.title, ''), c2.name, op.destination, 'Operação'), op.destination,
           op.stage, op.updated_at, tm2.full_name
      FROM public.operations op
      LEFT JOIN public.clients c2 ON c2.id = op.client_id
      LEFT JOIN public.agency_team_members tm2 ON tm2.id = op.assigned_team_member_id
     WHERE _can_ops AND op.user_id = ANY(_owners)
    ORDER BY updated_at DESC
    LIMIT 6
  ) t;

  -- Panorama operacional (contagens, sem valores)
  _counters := jsonb_build_object(
    'reservations_pending', CASE WHEN _can_res THEN (
        SELECT count(*) FROM public.travel_files f
         WHERE f.agency_id = ANY(_owners)
           AND f.status IN ('request_received','awaiting_reconfirmation','partially_available','awaiting_client')
      ) ELSE NULL END,
    'opportunities_open', CASE WHEN _can_opp THEN (
        SELECT count(*) FROM public.opportunities o
         WHERE o.user_id = ANY(_owners) AND o.stage NOT IN ('closed','lost')
      ) ELSE NULL END,
    'operations_active', CASE WHEN _can_ops THEN (
        SELECT count(*) FROM public.operations op
         WHERE op.user_id = ANY(_owners) AND COALESCE(op.stage, '') <> 'finalizado'
      ) ELSE NULL END,
    'trips_next_30_days', CASE WHEN _can_trips THEN (
        SELECT count(*) FROM public.trips tr
         WHERE tr.user_id = ANY(_owners)
           AND tr.start_date BETWEEN _today AND (_today + 30)
           AND lower(COALESCE(tr.status, '')) NOT IN ('archived','cancelado','cancelled','canceled','concluido','concluído','completed')
      ) ELSE NULL END
  );

  RETURN jsonb_build_object(
    'today', _today,
    'time_zone', _tz,
    'attention', _attention,
    'attention_total', _attention_total,
    'agenda', _agenda,
    'followups', _followups,
    'trips', _trips,
    'recent', _recent,
    'counters', _counters,
    'can', jsonb_build_object(
      'reservations', _can_res,
      'opportunities', _can_opp,
      'operations', _can_ops,
      'quotes', _can_quotes,
      'itineraries', _can_itin,
      'wallet', _can_wallet,
      'agenda', _can_agenda,
      'trips', _can_trips,
      'clients', public.can_team('clients.view'),
      'clients_create', public.can_team('clients.create'),
      'quotes_create', public.can_team('quotes.create'),
      'wallet_create', public.can_team('wallet.create'),
      'itineraries_create', public.can_team('itineraries.create'),
      'operations_create', public.can_team('operations.create')
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.get_agency_admin_dashboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agency_admin_dashboard(text) TO authenticated, service_role;