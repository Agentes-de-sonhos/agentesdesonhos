CREATE OR REPLACE FUNCTION public.get_agency_admin_dashboard(_time_zone text DEFAULT 'America/Sao_Paulo'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _can_fin boolean := public.can_team('financial.access');
  _activities jsonb := '[]'::jsonb;
  _today_items jsonb := '[]'::jsonb;
  _upcoming_items jsonb := '[]'::jsonb;
  _trips jsonb := '[]'::jsonb;
  _recent_projects jsonb := '[]'::jsonb;
  _recent_opps jsonb := '[]'::jsonb;
  _recent_ops jsonb := '[]'::jsonb;
  _counters jsonb := '{}'::jsonb;
  _opp_new integer := NULL;
  _opp_open integer := NULL;
  _ops_active integer := NULL;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  BEGIN
    _today := (now() AT TIME ZONE _tz)::date;
  EXCEPTION WHEN OTHERS THEN
    _tz := 'America/Sao_Paulo';
    _today := (now() AT TIME ZONE _tz)::date;
  END;

  -- Atividades (agenda + follow-ups) em uma leitura única.
  -- O ramo de follow-ups usa DISTINCT ON e, por isso, precisa ficar em uma
  -- subconsulta própria: em um UNION ALL o ORDER BY pertence à consulta
  -- externa e os aliases internos (fu/o/c) não existem lá.
  BEGIN
    WITH acts AS (
      SELECT 'event'::text AS kind, e.id::text AS id, e.id::text AS link_id,
             COALESCE(NULLIF(e.title, ''), 'Compromisso') AS title,
             NULLIF(btrim(COALESCE(c.name, '')
               || CASE WHEN c.name IS NOT NULL AND NULLIF(e.description,'') IS NOT NULL THEN ' · ' ELSE '' END
               || COALESCE(left(e.description, 90), '')), '') AS subtitle,
             COALESCE(NULLIF(e.event_type, ''), 'Agenda') AS type_label,
             e.event_date AS activity_date,
             e.event_time AS activity_time,
             COALESCE(e.all_day, false) AS all_day,
             false AS overdue
        FROM public.agency_events e
        LEFT JOIN public.clients c ON c.id = e.client_id
       WHERE _can_agenda
         AND e.user_id = ANY(_owners)
         AND e.deleted_at IS NULL
         AND e.event_date BETWEEN _today - 30 AND _today + 120
      UNION ALL
      SELECT f.kind, f.id, f.link_id, f.title, f.subtitle, f.type_label,
             f.activity_date, f.activity_time, f.all_day, f.overdue
        FROM (
          SELECT DISTINCT ON (fu.opportunity_id, fu.follow_up_date)
                 'followup'::text AS kind,
                 fu.id::text AS id,
                 fu.opportunity_id::text AS link_id,
                 COALESCE(c.name, o.destination, 'Oportunidade') AS title,
                 NULLIF(btrim(COALESCE(o.destination, '')
                   || CASE WHEN o.destination IS NOT NULL AND NULLIF(fu.note,'') IS NOT NULL THEN ' · ' ELSE '' END
                   || COALESCE(left(fu.note, 90), '')), '') AS subtitle,
                 'Follow-up'::text AS type_label,
                 fu.follow_up_date AS activity_date,
                 (fu.follow_up_at AT TIME ZONE _tz)::time AS activity_time,
                 false AS all_day,
                 (fu.follow_up_date < _today) AS overdue
            FROM public.opportunity_followups fu
            JOIN public.opportunities o ON o.id = fu.opportunity_id
            LEFT JOIN public.clients c ON c.id = o.client_id
           WHERE _can_opp
             AND o.user_id = ANY(_owners)
             AND o.stage NOT IN ('closed','lost')
             AND fu.follow_up_date IS NOT NULL
             AND fu.follow_up_date BETWEEN _today - 60 AND _today + 120
           ORDER BY fu.opportunity_id, fu.follow_up_date, fu.created_at
        ) f
    ), ranked AS (
      SELECT *,
             (activity_date <= _today) AS is_today,
             row_number() OVER (
               PARTITION BY (activity_date <= _today)
               ORDER BY activity_date, activity_time NULLS LAST
             ) AS rn
        FROM acts
    )
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.activity_date, t.activity_time NULLS LAST), '[]'::jsonb)
      INTO _activities
    FROM (
      SELECT kind, id, link_id, title, subtitle, type_label, activity_date, activity_time,
             all_day, overdue, is_today
        FROM ranked WHERE rn <= 25
    ) t;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'activity_date', x->>'activity_time' NULLS LAST), '[]'::jsonb)
      INTO _today_items
    FROM jsonb_array_elements(_activities) x
    WHERE (x->>'is_today')::boolean;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'activity_date', x->>'activity_time' NULLS LAST), '[]'::jsonb)
      INTO _upcoming_items
    FROM jsonb_array_elements(_activities) x
    WHERE NOT (x->>'is_today')::boolean;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'get_agency_admin_dashboard/activities: %', SQLERRM;
    _today_items := '[]'::jsonb;
    _upcoming_items := '[]'::jsonb;
  END;

  -- Próximas viagens (60 dias) com a operação vinculada, quando existir
  IF _can_trips THEN
    BEGIN
      SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.start_date), '[]'::jsonb) INTO _trips
      FROM (
        SELECT tr.id::text AS id,
               COALESCE(tr.client_name, c.name) AS client_name,
               tr.destination,
               tr.trip_title,
               tr.start_date,
               tr.end_date,
               (tr.start_date - _today) AS days_remaining,
               op.id::text AS operation_id,
               COALESCE(ops.name, op.stage) AS operation_status,
               true AS has_wallet
          FROM public.trips tr
          LEFT JOIN public.clients c ON c.id = tr.client_id
          LEFT JOIN LATERAL (
            SELECT o2.id, o2.stage, o2.user_id FROM public.operations o2
             WHERE _can_ops AND o2.trip_id = tr.id ORDER BY o2.updated_at DESC LIMIT 1
          ) op ON true
          LEFT JOIN public.operation_pipeline_stages ops
                 ON ops.user_id = op.user_id AND ops.key = op.stage
         WHERE tr.user_id = ANY(_owners)
           AND tr.start_date BETWEEN _today AND _today + 60
           AND lower(COALESCE(tr.status, '')) NOT IN ('archived','cancelado','cancelled','canceled','concluido','concluído','completed')
         ORDER BY tr.start_date
         LIMIT 20
      ) t;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_agency_admin_dashboard/trips: %', SQLERRM;
      _trips := '[]'::jsonb;
    END;
  END IF;

  -- Continue de onde parou — projetos (orçamentos, roteiros, carteiras)
  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.updated_at DESC), '[]'::jsonb) INTO _recent_projects
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
      ORDER BY updated_at DESC
      LIMIT 8
    ) t;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'get_agency_admin_dashboard/projects: %', SQLERRM;
    _recent_projects := '[]'::jsonb;
  END;

  IF _can_opp THEN
    BEGIN
      SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.updated_at DESC), '[]'::jsonb) INTO _recent_opps
      FROM (
        SELECT 'opportunity'::text AS kind, o.id::text AS id,
               COALESCE(c.name, o.destination, 'Oportunidade') AS title,
               o.destination AS subtitle,
               COALESCE(ps.name, o.stage) AS status,
               o.updated_at,
               tm.full_name AS responsible_name
          FROM public.opportunities o
          LEFT JOIN public.clients c ON c.id = o.client_id
          LEFT JOIN public.pipeline_stages ps ON ps.id = o.stage_id
          LEFT JOIN public.agency_team_members tm ON tm.id = o.assigned_team_member_id
         WHERE o.user_id = ANY(_owners) AND o.stage NOT IN ('closed','lost')
         ORDER BY o.updated_at DESC
         LIMIT 8
      ) t;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_agency_admin_dashboard/recent_opps: %', SQLERRM;
      _recent_opps := '[]'::jsonb;
    END;
  END IF;

  IF _can_ops THEN
    BEGIN
      SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.updated_at DESC), '[]'::jsonb) INTO _recent_ops
      FROM (
        SELECT 'operation'::text AS kind, op.id::text AS id,
               COALESCE(NULLIF(op.title, ''), c2.name, op.destination, 'Operação') AS title,
               op.destination AS subtitle,
               COALESCE(ops.name, op.stage) AS status,
               op.updated_at,
               tm2.full_name AS responsible_name
          FROM public.operations op
          LEFT JOIN public.clients c2 ON c2.id = op.client_id
          LEFT JOIN public.operation_pipeline_stages ops ON ops.user_id = op.user_id AND ops.key = op.stage
          LEFT JOIN public.agency_team_members tm2 ON tm2.id = op.assigned_team_member_id
         WHERE op.user_id = ANY(_owners)
         ORDER BY op.updated_at DESC
         LIMIT 8
      ) t;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_agency_admin_dashboard/recent_ops: %', SQLERRM;
      _recent_ops := '[]'::jsonb;
    END;
  END IF;

  -- Indicadores: cada um isolado para que uma falha não zere os demais.
  IF _can_opp THEN
    BEGIN
      SELECT count(*)::int INTO _opp_new
        FROM public.opportunities o
        LEFT JOIN public.pipeline_stages ps ON ps.id = o.stage_id
       WHERE o.user_id = ANY(_owners)
         AND o.stage NOT IN ('closed','lost')
         AND (
           (ps.id IS NOT NULL AND ps.position = (
              SELECT min(ps2.position) FROM public.pipeline_stages ps2
               WHERE ps2.user_id = ps.user_id AND COALESCE(ps2.legacy_key,'') NOT IN ('closed','lost')
           ))
           OR (o.stage_id IS NULL AND o.stage = 'new_contact')
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.opportunity_followups fu WHERE fu.opportunity_id = o.id
         );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_agency_admin_dashboard/opp_new: %', SQLERRM;
      _opp_new := NULL;
    END;

    BEGIN
      SELECT count(*)::int INTO _opp_open
        FROM public.opportunities o
       WHERE o.user_id = ANY(_owners) AND o.stage NOT IN ('closed','lost');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_agency_admin_dashboard/opp_open: %', SQLERRM;
      _opp_open := NULL;
    END;
  END IF;

  IF _can_ops THEN
    BEGIN
      SELECT count(*)::int INTO _ops_active
        FROM public.operations op
        LEFT JOIN public.operation_pipeline_stages ops
               ON ops.user_id = op.user_id AND ops.key = op.stage
       WHERE op.user_id = ANY(_owners)
         AND COALESCE(ops.legacy_key, op.stage, '') NOT IN ('finalizado','cancelado');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_agency_admin_dashboard/ops_active: %', SQLERRM;
      _ops_active := NULL;
    END;
  END IF;

  _counters := jsonb_build_object(
    'opportunities_new', _opp_new,
    'opportunities_open', _opp_open,
    'operations_active', _ops_active
  );

  RETURN jsonb_build_object(
    'today', _today,
    'time_zone', _tz,
    'today_items', _today_items,
    'upcoming_items', _upcoming_items,
    'trips', _trips,
    'recent_projects', _recent_projects,
    'recent_opportunities', _recent_opps,
    'recent_operations', _recent_ops,
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
      'financial', _can_fin,
      'clients', public.can_team('clients.view'),
      'clients_create', public.can_team('clients.create'),
      'quotes_create', public.can_team('quotes.create'),
      'wallet_create', public.can_team('wallet.create'),
      'itineraries_create', public.can_team('itineraries.create'),
      'operations_create', public.can_team('operations.create')
    )
  );
END $function$;