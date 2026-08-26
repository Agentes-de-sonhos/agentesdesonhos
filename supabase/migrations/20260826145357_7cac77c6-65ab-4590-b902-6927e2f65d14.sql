-- 1) Catálogo de permissões (idempotente)
INSERT INTO public.team_permission_catalog (permission_key, module_key, label, is_sensitive)
VALUES
  ('reservations.view', 'reservations', 'Visualizar a Central de Reservas', false),
  ('reservations.manage', 'reservations', 'Alterar etapas, dados operacionais e notas', false),
  ('reservations.assign', 'reservations', 'Definir responsáveis comercial e de operação', false),
  ('reservations.financial.manage', 'reservations', 'Alterar valores financeiros da reserva', true)
ON CONFLICT (permission_key) DO NOTHING;

-- 2) Índices de apoio às ordenações da lista
CREATE INDEX IF NOT EXISTS travel_files_opened_idx ON public.travel_files (agency_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS travel_files_updated_idx ON public.travel_files (agency_id, updated_at DESC);

-- 3) Listagem: leitura única, sem tabela temporária (a função continua STABLE)
DROP FUNCTION IF EXISTS public.travel_files_page(text, text[], date, date, uuid, integer, integer, text);

CREATE OR REPLACE FUNCTION public.travel_files_page(
  _search text DEFAULT NULL,
  _statuses text[] DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _responsible uuid DEFAULT NULL,
  _unread boolean DEFAULT false,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20,
  _sort text DEFAULT 'recent'
)
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
    _digits := NULLIF(ltrim(_digits, '0'), '');
  END IF;

  -- Etapas cujo rótulo combina com a busca (busca por status quando aplicável)
  IF _q IS NOT NULL THEN
    SELECT COALESCE(array_agg(s.st), ARRAY[]::text[]) INTO _status_matches
      FROM (VALUES
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

  -- Conjunto filtrado por tudo, EXCETO a etapa selecionada
  CREATE OR REPLACE TEMP VIEW _unused_never AS SELECT 1; -- placeholder removido abaixo
END $function$;

-- A definição real (sem placeholder) é aplicada em seguida.
CREATE OR REPLACE FUNCTION public.travel_files_page(
  _search text DEFAULT NULL,
  _statuses text[] DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _responsible uuid DEFAULT NULL,
  _unread boolean DEFAULT false,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20,
  _sort text DEFAULT 'recent'
)
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

  -- Contadores e total: uma única leitura do conjunto filtrado (sem a etapa)
  WITH scoped AS (
    SELECT f.id, f.status,
           (NOT EXISTS (SELECT 1 FROM public.travel_file_views v
                         WHERE v.file_id = f.id AND v.user_id = _uid)) AS unread,
           f.opened_at
      FROM public.travel_files f
      LEFT JOIN public.clients c ON c.id = f.client_id
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
         OR COALESCE(f.protocol_snapshot, '') ILIKE '%' || _q || '%'
         OR COALESCE(c.name, '') ILIKE '%' || _q || '%'
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
      'new', count(*) FILTER (WHERE v.status = 'request_received'),
      'awaiting_reconfirmation', count(*) FILTER (WHERE v.status = 'awaiting_reconfirmation'),
      'partially_available', count(*) FILTER (WHERE v.status = 'partially_available'),
      'awaiting_client', count(*) FILTER (WHERE v.status = 'awaiting_client'),
      'confirmed', count(*) FILTER (WHERE v.status = 'sale_confirmed'),
      'in_operation', count(*) FILTER (WHERE v.status = 'in_operation'),
      'completed', count(*) FILTER (WHERE v.status = 'trip_completed'),
      'cancelled', count(*) FILTER (WHERE v.status = 'cancelled'),
      'overdue', count(*) FILTER (
        WHERE v.status NOT IN ('sale_confirmed','trip_completed','cancelled')
          AND v.opened_at <= now() - interval '2 days'
      ),
      'unread', count(*) FILTER (WHERE v.unread)
    )
    INTO _total, _counts
  FROM visible v;

  _pages := GREATEST(1, CEIL(_total::numeric / _limit)::integer);
  IF _page_out > _pages THEN _page_out := _pages; END IF;
  _offset := (_page_out - 1) * _limit;

  -- Página de resultados
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
        c.name AS client_name,
        COALESCE(sv.services_count, 0)::int AS services_count,
        COALESCE(sv.service_names, ARRAY[]::text[]) AS service_names,
        NOT EXISTS (SELECT 1 FROM public.travel_file_views v
                     WHERE v.file_id = f.id AND v.user_id = _uid) AS unread,
        tm.full_name AS responsible_name,
        tmo.full_name AS operations_responsible_name
      FROM public.travel_files f
      LEFT JOIN public.clients c ON c.id = f.client_id
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
         OR COALESCE(f.protocol_snapshot, '') ILIKE '%' || _q || '%'
         OR COALESCE(c.name, '') ILIKE '%' || _q || '%'
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
    'pages', _pages,
    'page_size', _limit,
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

-- 4) Responsáveis: sempre colaborador ativo da própria agência
CREATE OR REPLACE FUNCTION private.assert_team_member_of_agency(_member uuid)
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _member IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_team_members m
     WHERE m.id = _member
       AND m.status = 'active'
       AND m.agency_id = ANY(private.agency_owner_ids())
  ) THEN
    RAISE EXCEPTION 'Selecione um colaborador ativo da sua agência.';
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.travel_file_set_responsibles(
  _file_id uuid, _commercial uuid DEFAULT NULL, _operations uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _file public.travel_files;
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.assign');
  PERFORM private.assert_team_member_of_agency(_commercial);
  PERFORM private.assert_team_member_of_agency(_operations);

  UPDATE public.travel_files
     SET responsible_team_member_id = _commercial,
         operations_responsible_team_member_id = _operations,
         updated_at = now()
   WHERE id = _file.id;
END $function$;

-- 5) Serviços: permissão de LEITURA nunca autoriza gravação
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
SET search_path TO 'public'
AS $function$
DECLARE
  _svc public.travel_file_services;
  _file public.travel_files;
  _changed boolean;
BEGIN
  SELECT * INTO _svc FROM public.travel_file_services WHERE id = _service_id;
  IF _svc.id IS NULL THEN RAISE EXCEPTION 'Serviço não encontrado.'; END IF;
  _file := private.assert_travel_file_access(_svc.file_id, 'reservations.manage');

  IF _status IS NOT NULL AND _status NOT IN ('requested','reconfirming','available','amount_changed',
      'unavailable','awaiting_client','booked','paid','issued','delivered','cancelled') THEN
    RAISE EXCEPTION 'Situação de serviço inválida.';
  END IF;

  IF _touch_financials THEN
    -- Valor vendido e custo: exigem permissão de gestão financeira da reserva.
    _changed := (_sold_amount IS DISTINCT FROM _svc.sold_amount)
             OR (_cost_amount IS DISTINCT FROM _svc.cost_amount);
    IF _changed AND NOT public.can_team('reservations.financial.manage') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar os valores financeiros da reserva.';
    END IF;
    -- Comissão: permissão específica de comissões.
    IF (_commission_amount IS DISTINCT FROM _svc.commission_amount)
       AND NOT public.can_team('financial.commissions.manage') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar comissões.';
    END IF;
    -- Valor reconfirmado é dado operacional: basta reservations.manage (já validado).
  END IF;

  IF _touch_responsible THEN
    IF NOT public.can_team('reservations.assign') THEN
      RAISE EXCEPTION 'Você não possui permissão para definir responsáveis.';
    END IF;
    PERFORM private.assert_team_member_of_agency(_responsible);
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
END $function$;

-- 6) Etapas do file consistentes com as datas (histórico preservado pelo trigger)
CREATE OR REPLACE FUNCTION public.travel_file_set_status(
  _file_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _file public.travel_files;
  _clean_reason text := NULLIF(btrim(COALESCE(_reason, '')), '');
  _pre_sale text[] := ARRAY['request_received','awaiting_reconfirmation','partially_available','awaiting_client'];
  _sold text[] := ARRAY['sale_confirmed','in_operation','trip_completed'];
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.manage');

  IF _status NOT IN ('request_received','awaiting_reconfirmation','partially_available',
                     'awaiting_client','sale_confirmed','in_operation','trip_completed','cancelled') THEN
    RAISE EXCEPTION 'Etapa inválida.';
  END IF;
  IF _status = 'cancelled' AND _clean_reason IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.';
  END IF;
  IF _status = 'request_received' AND _file.status = ANY(_sold) THEN
    RAISE EXCEPTION 'Não é possível voltar para "Solicitação recebida" depois da venda confirmada. Escolha "Aguardando cliente" ou cancele o processo informando o motivo.';
  END IF;

  UPDATE public.travel_files f
     SET status = _status,
         -- Cancelamento: motivo e data. Ao sair do cancelamento o processo deixa
         -- de estar operacionalmente cancelado (o histórico permanece no log).
         cancellation_reason = CASE WHEN _status = 'cancelled' THEN left(_clean_reason, 1000) ELSE NULL END,
         cancelled_at = CASE WHEN _status = 'cancelled' THEN COALESCE(f.cancelled_at, now()) ELSE NULL END,
         -- Confirmação da venda: mantida enquanto a venda existir, limpa ao voltar para pré-venda.
         confirmed_at = CASE
             WHEN _status = ANY(_sold) THEN COALESCE(f.confirmed_at, now())
             WHEN _status = ANY(_pre_sale) THEN NULL
             ELSE f.confirmed_at END,
         -- Conclusão: apenas quando a viagem está concluída.
         completed_at = CASE
             WHEN _status = 'trip_completed' THEN COALESCE(f.completed_at, now())
             WHEN _status = 'cancelled' THEN f.completed_at
             ELSE NULL END,
         updated_at = now()
   WHERE f.id = _file.id;
END $function$;