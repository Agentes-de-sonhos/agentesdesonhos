CREATE OR REPLACE FUNCTION public.admin_agency_teams_list(
  _search text DEFAULT NULL,
  _plan text DEFAULT NULL,
  _team text DEFAULT 'all',
  _at_limit boolean DEFAULT false,
  _pending boolean DEFAULT false,
  _limit integer DEFAULT 20,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  agency_id uuid, agency_name text, owner_name text, owner_email text, plan text,
  active_members integer, inactive_members integer, pending_invites integer,
  seats_used integer, seats_limit integer, limit_override integer,
  last_activity timestamp with time zone, total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH owners AS (
    SELECT p.user_id AS id,
      COALESCE(NULLIF(btrim(p.agency_name), ''), NULLIF(btrim(p.name), ''), 'Agência sem nome') AS agency_name,
      p.name AS owner_name,
      u.email::text AS owner_email
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE p.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.agency_team_members m WHERE m.auth_user_id = p.user_id
      )
  ),
  plans AS (
    SELECT o.id,
      COALESCE((
        SELECT s.plan::text FROM public.subscriptions s
        WHERE s.user_id = o.id AND s.is_active
          AND (s.expires_at IS NULL OR s.expires_at > now())
        ORDER BY s.expires_at DESC NULLS FIRST
        LIMIT 1
      ), 'essencial') AS plan
    FROM owners o
  ),
  mem AS (
    SELECT m.agency_id,
      COUNT(*) FILTER (WHERE m.status = 'active')::int AS active_members,
      COUNT(*) FILTER (WHERE m.status IN ('blocked','disabled'))::int AS inactive_members,
      COUNT(*) FILTER (WHERE m.status IN ('active','blocked'))::int AS seat_members,
      MAX(COALESCE(m.last_login_at, m.updated_at)) AS last_activity
    FROM public.agency_team_members m
    GROUP BY m.agency_id
  ),
  inv AS (
    SELECT i.agency_id, COUNT(*)::int AS pending_invites
    FROM public.agency_team_invites i
    WHERE i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
    GROUP BY i.agency_id
  ),
  joined AS (
    SELECT o.id AS agency_id, o.agency_name, o.owner_name, o.owner_email, pl.plan,
      COALESCE(m.active_members, 0) AS active_members,
      COALESCE(m.inactive_members, 0) AS inactive_members,
      COALESCE(i.pending_invites, 0) AS pending_invites,
      COALESCE(m.seat_members, 0) + COALESCE(i.pending_invites, 0) AS seats_used,
      COALESCE(ov.max_members, ptl.max_members, 3) AS seats_limit,
      ov.max_members AS limit_override,
      m.last_activity
    FROM owners o
    JOIN plans pl ON pl.id = o.id
    LEFT JOIN mem m ON m.agency_id = o.id
    LEFT JOIN inv i ON i.agency_id = o.id
    LEFT JOIN public.agency_team_limit_overrides ov ON ov.agency_id = o.id
    LEFT JOIN public.plan_team_limits ptl ON ptl.plan::text = pl.plan
  ),
  filtered AS (
    SELECT j.* FROM joined j
    WHERE (
        _search IS NULL OR btrim(_search) = ''
        OR j.agency_name ILIKE '%' || btrim(_search) || '%'
        OR COALESCE(j.owner_name, '') ILIKE '%' || btrim(_search) || '%'
        OR COALESCE(j.owner_email, '') ILIKE '%' || btrim(_search) || '%'
        OR j.agency_id::text = lower(btrim(_search))
      )
      AND (_plan IS NULL OR _plan IN ('', 'all') OR j.plan = _plan)
      AND (
        COALESCE(_team, 'all') = 'all'
        OR (_team = 'with' AND j.active_members + j.inactive_members > 0)
        OR (_team = 'without' AND j.active_members + j.inactive_members = 0)
      )
      AND (NOT COALESCE(_at_limit, false) OR j.seats_used >= j.seats_limit)
      AND (NOT COALESCE(_pending, false) OR j.pending_invites > 0)
  )
  SELECT f.agency_id, f.agency_name, f.owner_name, f.owner_email, f.plan,
    f.active_members, f.inactive_members, f.pending_invites, f.seats_used,
    f.seats_limit, f.limit_override, f.last_activity,
    (SELECT COUNT(*) FROM filtered) AS total_count
  FROM filtered f
  ORDER BY (f.active_members + f.pending_invites) DESC, f.agency_name ASC
  LIMIT GREATEST(COALESCE(_limit, 20), 1)
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
$function$;

REVOKE ALL ON FUNCTION public.admin_agency_teams_list(text, text, text, boolean, boolean, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_agency_teams_list(text, text, text, boolean, boolean, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_agency_teams_list(text, text, text, boolean, boolean, integer, integer) TO service_role;