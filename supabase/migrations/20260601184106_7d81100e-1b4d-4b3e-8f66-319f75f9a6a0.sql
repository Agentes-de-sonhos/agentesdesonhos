CREATE OR REPLACE FUNCTION public.admin_user_usage_report(_start timestamptz, _end timestamptz)
RETURNS TABLE(
  user_id uuid,
  name text,
  email text,
  phone text,
  agency_name text,
  role text,
  plan text,
  is_active boolean,
  created_at timestamptz,
  last_active_at timestamptz,
  quotes_count bigint,
  wallets_count bigint,
  itineraries_count bigint,
  business_cards_count bigint,
  showcases_count bigint,
  lead_forms_count bigint,
  sales_landings_count bigint,
  clients_count bigint,
  opportunities_count bigint,
  operations_count bigint,
  sales_count bigint,
  income_entries_count bigint,
  expense_entries_count bigint,
  invoices_count bigint,
  customer_payments_count bigint,
  sellers_count bigint,
  team_members_count bigint,
  total_actions bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH
    q AS (SELECT user_id AS uid, count(*) c FROM public.quotes WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    tr AS (SELECT user_id AS uid, count(*) c FROM public.trips WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    it AS (SELECT user_id AS uid, count(*) c FROM public.itineraries WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    bc AS (SELECT user_id AS uid, count(*) c FROM public.business_cards WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    sh AS (SELECT user_id AS uid, count(*) c FROM public.agency_showcases WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    lf AS (SELECT user_id AS uid, count(*) c FROM public.lead_capture_forms WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    sl AS (SELECT user_id AS uid, count(*) c FROM public.sales_landings WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    cl AS (SELECT user_id AS uid, count(*) c FROM public.clients WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    op AS (SELECT user_id AS uid, count(*) c FROM public.opportunities WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    ops AS (SELECT user_id AS uid, count(*) c FROM public.operations WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    sa AS (SELECT user_id AS uid, count(*) c FROM public.sales WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    ie AS (SELECT user_id AS uid, count(*) c FROM public.income_entries WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    ee AS (SELECT user_id AS uid, count(*) c FROM public.expense_entries WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    iv AS (SELECT user_id AS uid, count(*) c FROM public.invoices WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    cp AS (SELECT user_id AS uid, count(*) c FROM public.customer_payments WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    se AS (SELECT user_id AS uid, count(*) c FROM public.sellers WHERE created_at BETWEEN _start AND _end GROUP BY user_id),
    tm AS (SELECT agency_id AS uid, count(*) c FROM public.agency_team_members WHERE created_at BETWEEN _start AND _end GROUP BY agency_id)
  SELECT
    p.user_id,
    p.name,
    au.email::text AS email,
    p.phone,
    p.agency_name,
    COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.user_id ORDER BY (ur.role = 'admin') DESC LIMIT 1), 'agente') AS role,
    COALESCE((SELECT s.plan::text FROM public.subscriptions s WHERE s.user_id = p.user_id ORDER BY s.created_at DESC LIMIT 1), 'essencial') AS plan,
    COALESCE((SELECT s.is_active FROM public.subscriptions s WHERE s.user_id = p.user_id ORDER BY s.created_at DESC LIMIT 1), true) AS is_active,
    p.created_at,
    up.last_active_at,
    COALESCE(q.c,0), COALESCE(tr.c,0), COALESCE(it.c,0), COALESCE(bc.c,0), COALESCE(sh.c,0),
    COALESCE(lf.c,0), COALESCE(sl.c,0),
    COALESCE(cl.c,0), COALESCE(op.c,0), COALESCE(ops.c,0),
    COALESCE(sa.c,0), COALESCE(ie.c,0), COALESCE(ee.c,0), COALESCE(iv.c,0), COALESCE(cp.c,0),
    COALESCE(se.c,0), COALESCE(tm.c,0),
    (COALESCE(q.c,0)+COALESCE(tr.c,0)+COALESCE(it.c,0)+COALESCE(bc.c,0)+COALESCE(sh.c,0)
     +COALESCE(lf.c,0)+COALESCE(sl.c,0)+COALESCE(cl.c,0)+COALESCE(op.c,0)+COALESCE(ops.c,0)
     +COALESCE(sa.c,0)+COALESCE(ie.c,0)+COALESCE(ee.c,0)+COALESCE(iv.c,0)+COALESCE(cp.c,0)
     +COALESCE(se.c,0)+COALESCE(tm.c,0)) AS total_actions
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.user_presence up ON up.user_id = p.user_id
  LEFT JOIN q   ON q.uid   = p.user_id
  LEFT JOIN tr  ON tr.uid  = p.user_id
  LEFT JOIN it  ON it.uid  = p.user_id
  LEFT JOIN bc  ON bc.uid  = p.user_id
  LEFT JOIN sh  ON sh.uid  = p.user_id
  LEFT JOIN lf  ON lf.uid  = p.user_id
  LEFT JOIN sl  ON sl.uid  = p.user_id
  LEFT JOIN cl  ON cl.uid  = p.user_id
  LEFT JOIN op  ON op.uid  = p.user_id
  LEFT JOIN ops ON ops.uid = p.user_id
  LEFT JOIN sa  ON sa.uid  = p.user_id
  LEFT JOIN ie  ON ie.uid  = p.user_id
  LEFT JOIN ee  ON ee.uid  = p.user_id
  LEFT JOIN iv  ON iv.uid  = p.user_id
  LEFT JOIN cp  ON cp.uid  = p.user_id
  LEFT JOIN se  ON se.uid  = p.user_id
  LEFT JOIN tm  ON tm.uid  = p.user_id
  ORDER BY total_actions DESC, p.name ASC;
END;
$$;