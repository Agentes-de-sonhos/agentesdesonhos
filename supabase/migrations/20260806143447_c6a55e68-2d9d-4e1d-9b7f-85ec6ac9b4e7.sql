-- ─────────────────────────────────────────────────────────────
-- 1) Leitura/gestão da equipe: proprietário OU colaborador ativo com team.manage
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.team_can_manage_team()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.can_team('team.manage')
$function$;

REVOKE ALL ON FUNCTION public.team_can_manage_team() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_can_manage_team() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.team_can_read_team(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _uid IS NULL OR _uid <> auth.uid() THEN false
    ELSE public.team_can_manage_team()
  END
$function$;

REVOKE ALL ON FUNCTION public.team_can_read_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_can_read_team(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.team_members_overview()
RETURNS TABLE(id uuid, login text, full_name text, email text, phone text, avatar_url text, role_title text, department text, team_name text, access_profile_id uuid, access_profile_name text, access_profile_key text, status team_member_status, last_login_at timestamp with time zone, invited_at timestamp with time zone, activated_at timestamp with time zone, created_at timestamp with time zone, permissions_count bigint, stage_permissions_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT m.id, m.login, m.full_name, m.email, m.phone, m.avatar_url,
    m.role_title, m.department, m.team_name,
    m.access_profile_id, ap.name, ap.key,
    m.status, m.last_login_at, m.invited_at, m.activated_at, m.created_at,
    (SELECT COUNT(*) FROM public.agency_team_permissions p WHERE p.team_member_id = m.id AND p.enabled),
    (SELECT COUNT(*) FROM public.agency_team_stage_permissions s WHERE s.team_member_id = m.id)
  FROM public.agency_team_members m
  LEFT JOIN public.agency_access_profiles ap ON ap.id = m.access_profile_id
  WHERE m.agency_id = public.user_agency_id(auth.uid())
    AND public.team_can_manage_team()
  ORDER BY m.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.team_members_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_members_overview() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.team_list_invites()
RETURNS TABLE(id uuid, email text, full_name text, role_title text, department text, team_name text, access_profile_id uuid, access_profile_name text, expires_at timestamp with time zone, accepted_at timestamp with time zone, revoked_at timestamp with time zone, sent_count integer, last_sent_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.id, i.email, i.full_name, i.role_title, i.department, i.team_name,
    i.access_profile_id, ap.name,
    i.expires_at, i.accepted_at, i.revoked_at, i.sent_count, i.last_sent_at, i.created_at
  FROM public.agency_team_invites i
  LEFT JOIN public.agency_access_profiles ap ON ap.id = i.access_profile_id
  WHERE i.agency_id = public.user_agency_id(auth.uid())
    AND public.team_can_manage_team()
  ORDER BY i.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.team_list_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_list_invites() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.team_member_scopes(_member_id uuid)
RETURNS TABLE(module_key text, scope team_data_scope)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.module_key, s.scope
  FROM public.agency_team_scopes s
  JOIN public.agency_team_members m ON m.id = s.team_member_id
  WHERE s.team_member_id = _member_id
    AND m.agency_id = public.user_agency_id(auth.uid())
    AND public.team_can_manage_team();
$function$;

REVOKE ALL ON FUNCTION public.team_member_scopes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_member_scopes(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.team_get_member_detail(_member_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'id', m.id,
    'login', m.login,
    'full_name', m.full_name,
    'role_title', m.role_title,
    'notification_email', m.notification_email,
    'email', m.email,
    'phone', m.phone,
    'avatar_url', m.avatar_url,
    'department', m.department,
    'team_name', m.team_name,
    'access_profile_id', m.access_profile_id,
    'status', m.status,
    'last_login_at', m.last_login_at,
    'invited_at', m.invited_at,
    'activated_at', m.activated_at,
    'created_at', m.created_at,
    'permissions', COALESCE((
      SELECT json_agg(json_build_object('module_key', p.module_key, 'permission_key', p.permission_key, 'enabled', p.enabled))
      FROM public.agency_team_permissions p WHERE p.team_member_id = m.id
    ), '[]'::json),
    'stage_permissions', COALESCE((
      SELECT json_agg(json_build_object('pipeline_type', s.pipeline_type, 'stage_id', s.stage_id,
        'can_view', s.can_view, 'can_edit', s.can_edit, 'can_move', s.can_move))
      FROM public.agency_team_stage_permissions s WHERE s.team_member_id = m.id
    ), '[]'::json),
    'scopes', COALESCE((
      SELECT json_object_agg(sc.module_key, sc.scope)
      FROM public.agency_team_scopes sc WHERE sc.team_member_id = m.id
    ), '{}'::json)
  )
  FROM public.agency_team_members m
  WHERE m.id = _member_id
    AND m.agency_id = public.user_agency_id(auth.uid())
    AND public.team_can_manage_team();
$function$;

REVOKE ALL ON FUNCTION public.team_get_member_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_get_member_detail(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 2) Comunidade: proprietário OU colaborador ativo com team.manage
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.agency_community_settings_save(_public boolean, _internal boolean, _online boolean, _internal_chat boolean, _external_chat boolean, _preset text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _agency uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.team_can_manage_team() THEN
    RAISE EXCEPTION 'Sem permissão para alterar as configurações de comunidade da agência.';
  END IF;
  IF _preset IS NULL OR _preset NOT IN ('full','agency_only','disabled','custom') THEN
    RAISE EXCEPTION 'Modo inválido.';
  END IF;

  _agency := public.user_agency_id(auth.uid());

  INSERT INTO public.agency_community_settings AS s (agency_id, public_community_enabled,
    internal_community_enabled, online_users_enabled, internal_chat_enabled, external_chat_enabled,
    preset, updated_by)
  VALUES (_agency, COALESCE(_public,true), COALESCE(_internal,true), COALESCE(_online,true),
    COALESCE(_internal_chat,true), COALESCE(_external_chat,true), _preset, auth.uid())
  ON CONFLICT (agency_id) DO UPDATE SET
    public_community_enabled = EXCLUDED.public_community_enabled,
    internal_community_enabled = EXCLUDED.internal_community_enabled,
    online_users_enabled = EXCLUDED.online_users_enabled,
    internal_chat_enabled = EXCLUDED.internal_chat_enabled,
    external_chat_enabled = EXCLUDED.external_chat_enabled,
    preset = EXCLUDED.preset, updated_by = auth.uid(), updated_at = now();

  -- Auditoria pelo ator real (proprietário ou colaborador com team.manage).
  INSERT INTO public.agency_team_audit_log (agency_id, actor_user_id, action, module_key, details)
  VALUES (_agency, auth.uid(), 'community_settings_update', 'community',
    jsonb_build_object('preset', _preset, 'public', _public, 'internal', _internal,
      'online', _online, 'internal_chat', _internal_chat, 'external_chat', _external_chat));

  RETURN public.agency_community_settings_get();
END $function$;

REVOKE ALL ON FUNCTION public.agency_community_settings_save(boolean, boolean, boolean, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agency_community_settings_save(boolean, boolean, boolean, boolean, boolean, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3) Listagem administrativa global: o UID da agência é profiles.user_id
-- ─────────────────────────────────────────────────────────────
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
REVOKE ALL ON FUNCTION public.admin_agency_teams_list(text, text, text, boolean, boolean, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_agency_teams_list(text, text, text, boolean, boolean, integer, integer) TO service_role;