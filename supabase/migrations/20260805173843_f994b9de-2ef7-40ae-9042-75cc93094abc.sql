-- Hardening: nada de execução anônima nas novas funções auxiliares
REVOKE EXECUTE ON FUNCTION public.team_member_row(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_agency_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_subuser(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_scope_for(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_record_visible(text, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.agency_community_flags(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_use_public_community() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_chat_externally(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_see_agency_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_member_row(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_agency_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_subuser(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_scope_for(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_record_visible(text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_community_flags(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_use_public_community() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_chat_externally(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_see_agency_user(uuid) TO authenticated, service_role;

-- ============================================================
-- team_self estendido (retrocompatível: mantém member/permissions/stage_permissions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.team_self()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _m record; _agency uuid; _result json;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  SELECT m.* INTO _m FROM public.agency_team_members m WHERE m.auth_user_id = auth.uid() LIMIT 1;
  _agency := COALESCE(_m.agency_id, auth.uid());

  SELECT json_build_object(
    'member', CASE WHEN _m.id IS NULL THEN NULL ELSE json_build_object(
      'id', _m.id, 'agency_id', _m.agency_id, 'login', _m.login,
      'full_name', _m.full_name, 'role_title', _m.role_title,
      'email', _m.email, 'phone', _m.phone, 'avatar_url', _m.avatar_url,
      'department', _m.department, 'team_name', _m.team_name,
      'status', _m.status, 'access_profile_id', _m.access_profile_id
    ) END,
    'is_owner', (_m.id IS NULL),
    'agency_id', _agency,
    'access_profile', (
      SELECT json_build_object('id', ap.id, 'key', ap.key, 'name', ap.name, 'is_native', ap.is_native)
      FROM public.agency_access_profiles ap WHERE ap.id = _m.access_profile_id
    ),
    'permissions', COALESCE((
      SELECT json_agg(json_build_object('module_key', p.module_key, 'permission_key', p.permission_key, 'enabled', p.enabled))
      FROM public.agency_team_permissions p WHERE p.team_member_id = _m.id
    ), '[]'::json),
    'stage_permissions', COALESCE((
      SELECT json_agg(json_build_object('pipeline_type', s.pipeline_type, 'stage_id', s.stage_id,
        'can_view', s.can_view, 'can_edit', s.can_edit, 'can_move', s.can_move))
      FROM public.agency_team_stage_permissions s WHERE s.team_member_id = _m.id
    ), '[]'::json),
    'scopes', COALESCE((
      SELECT json_object_agg(sc.module_key, sc.scope)
      FROM public.agency_team_scopes sc WHERE sc.team_member_id = _m.id
    ), '{}'::json),
    'community', (
      SELECT json_build_object(
        'public_community_enabled', f.public_community_enabled,
        'internal_community_enabled', f.internal_community_enabled,
        'online_users_enabled', f.online_users_enabled,
        'internal_chat_enabled', f.internal_chat_enabled,
        'external_chat_enabled', f.external_chat_enabled
      ) FROM public.agency_community_flags(_agency) f
    )
  ) INTO _result;

  RETURN _result;
END $$;

-- ============================================================
-- Limite de usuários por plano
-- ============================================================
DROP FUNCTION IF EXISTS public.team_member_quota();
CREATE OR REPLACE FUNCTION public.team_member_quota()
RETURNS TABLE(used integer, total integer, plan text, pending integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _agency uuid; _plan public.subscription_plan; _max int;
BEGIN
  _agency := public.user_agency_id(auth.uid());
  _plan := public.get_user_plan(_agency);
  SELECT o.max_members INTO _max FROM public.agency_team_limit_overrides o WHERE o.agency_id = _agency;
  IF _max IS NULL THEN
    SELECT l.max_members INTO _max FROM public.plan_team_limits l WHERE l.plan = _plan;
  END IF;
  _max := COALESCE(_max, 3);
  RETURN QUERY
    SELECT
      (SELECT COUNT(*)::int FROM public.agency_team_members m
        WHERE m.agency_id = _agency AND m.status IN ('active','blocked')),
      _max,
      _plan::text,
      (SELECT COUNT(*)::int FROM public.agency_team_invites i
        WHERE i.agency_id = _agency AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now());
END $$;
REVOKE EXECUTE ON FUNCTION public.team_member_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_member_quota() TO authenticated, service_role;

-- ============================================================
-- Visão geral da equipe
-- ============================================================
CREATE OR REPLACE FUNCTION public.team_members_overview()
RETURNS TABLE(
  id uuid, login text, full_name text, email text, phone text, avatar_url text,
  role_title text, department text, team_name text,
  access_profile_id uuid, access_profile_name text, access_profile_key text,
  status public.team_member_status, last_login_at timestamptz,
  invited_at timestamptz, activated_at timestamptz, created_at timestamptz,
  permissions_count bigint, stage_permissions_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.login, m.full_name, m.email, m.phone, m.avatar_url,
    m.role_title, m.department, m.team_name,
    m.access_profile_id, ap.name, ap.key,
    m.status, m.last_login_at, m.invited_at, m.activated_at, m.created_at,
    (SELECT COUNT(*) FROM public.agency_team_permissions p WHERE p.team_member_id = m.id AND p.enabled),
    (SELECT COUNT(*) FROM public.agency_team_stage_permissions s WHERE s.team_member_id = m.id)
  FROM public.agency_team_members m
  LEFT JOIN public.agency_access_profiles ap ON ap.id = m.access_profile_id
  WHERE m.agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid())
  ORDER BY m.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.team_members_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_members_overview() TO authenticated, service_role;

-- Convites pendentes
CREATE OR REPLACE FUNCTION public.team_list_invites()
RETURNS TABLE(
  id uuid, email text, full_name text, role_title text, department text, team_name text,
  access_profile_id uuid, access_profile_name text,
  expires_at timestamptz, accepted_at timestamptz, revoked_at timestamptz,
  sent_count integer, last_sent_at timestamptz, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.email, i.full_name, i.role_title, i.department, i.team_name,
    i.access_profile_id, ap.name,
    i.expires_at, i.accepted_at, i.revoked_at, i.sent_count, i.last_sent_at, i.created_at
  FROM public.agency_team_invites i
  LEFT JOIN public.agency_access_profiles ap ON ap.id = i.access_profile_id
  WHERE i.agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid())
  ORDER BY i.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.team_list_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_list_invites() TO authenticated, service_role;

-- Perfis de acesso disponíveis
CREATE OR REPLACE FUNCTION public.team_access_profiles()
RETURNS TABLE(id uuid, agency_id uuid, key text, name text, description text,
  is_native boolean, permission_keys text[], scopes jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ap.id, ap.agency_id, ap.key, ap.name, ap.description, ap.is_native, ap.permission_keys, ap.scopes
  FROM public.agency_access_profiles ap
  WHERE ap.agency_id IS NULL OR ap.agency_id = public.user_agency_id(auth.uid())
  ORDER BY ap.is_native DESC, ap.name;
$$;
REVOKE EXECUTE ON FUNCTION public.team_access_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_access_profiles() TO authenticated, service_role;

-- Escopos de um membro
CREATE OR REPLACE FUNCTION public.team_member_scopes(_member_id uuid)
RETURNS TABLE(module_key text, scope public.team_data_scope)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.module_key, s.scope
  FROM public.agency_team_scopes s
  JOIN public.agency_team_members m ON m.id = s.team_member_id
  WHERE s.team_member_id = _member_id
    AND m.agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.team_member_scopes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_member_scopes(uuid) TO authenticated, service_role;

-- Diretório interno da agência (para filtros e atribuição)
CREATE OR REPLACE FUNCTION public.agency_team_directory()
RETURNS TABLE(member_id uuid, auth_user_id uuid, full_name text, role_title text,
  department text, team_name text, avatar_url text, status public.team_member_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.auth_user_id, m.full_name, m.role_title, m.department, m.team_name, m.avatar_url, m.status
  FROM public.agency_team_members m
  WHERE m.agency_id = public.user_agency_id(auth.uid())
  ORDER BY m.full_name;
$$;
REVOKE EXECUTE ON FUNCTION public.agency_team_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_team_directory() TO authenticated, service_role;

-- Configurações de comunidade: leitura + gravação (somente proprietário)
CREATE OR REPLACE FUNCTION public.agency_community_settings_get()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'public_community_enabled', f.public_community_enabled,
    'internal_community_enabled', f.internal_community_enabled,
    'online_users_enabled', f.online_users_enabled,
    'internal_chat_enabled', f.internal_chat_enabled,
    'external_chat_enabled', f.external_chat_enabled,
    'preset', COALESCE((SELECT s.preset FROM public.agency_community_settings s
                        WHERE s.agency_id = public.user_agency_id(auth.uid())), 'full')
  )
  FROM public.agency_community_flags(public.user_agency_id(auth.uid())) f;
$$;
REVOKE EXECUTE ON FUNCTION public.agency_community_settings_get() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_community_settings_get() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.agency_community_settings_save(
  _public boolean, _internal boolean, _online boolean, _internal_chat boolean, _external_chat boolean, _preset text
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_team_subuser(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o proprietário da agência pode alterar estas configurações.';
  END IF;
  IF _preset IS NULL OR _preset NOT IN ('full','agency_only','disabled','custom') THEN
    RAISE EXCEPTION 'Modo inválido.';
  END IF;

  INSERT INTO public.agency_community_settings AS s (agency_id, public_community_enabled,
    internal_community_enabled, online_users_enabled, internal_chat_enabled, external_chat_enabled,
    preset, updated_by)
  VALUES (auth.uid(), COALESCE(_public,true), COALESCE(_internal,true), COALESCE(_online,true),
    COALESCE(_internal_chat,true), COALESCE(_external_chat,true), _preset, auth.uid())
  ON CONFLICT (agency_id) DO UPDATE SET
    public_community_enabled = EXCLUDED.public_community_enabled,
    internal_community_enabled = EXCLUDED.internal_community_enabled,
    online_users_enabled = EXCLUDED.online_users_enabled,
    internal_chat_enabled = EXCLUDED.internal_chat_enabled,
    external_chat_enabled = EXCLUDED.external_chat_enabled,
    preset = EXCLUDED.preset, updated_by = auth.uid(), updated_at = now();

  INSERT INTO public.agency_team_audit_log (agency_id, actor_user_id, action, module_key, details)
  VALUES (auth.uid(), auth.uid(), 'community_settings_update', 'community',
    jsonb_build_object('preset', _preset, 'public', _public, 'internal', _internal,
      'online', _online, 'internal_chat', _internal_chat, 'external_chat', _external_chat));

  RETURN public.agency_community_settings_get();
END $$;
REVOKE EXECUTE ON FUNCTION public.agency_community_settings_save(boolean,boolean,boolean,boolean,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_community_settings_save(boolean,boolean,boolean,boolean,boolean,text) TO authenticated, service_role;

-- Auditoria da agência (somente autorizados)
CREATE OR REPLACE FUNCTION public.team_audit_log(_limit integer DEFAULT 100, _member_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, action text, module_key text, entity_type text, entity_id text,
  team_member_id uuid, member_name text, actor_user_id uuid, details jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.action, a.module_key, a.entity_type, a.entity_id,
    a.team_member_id, m.full_name, a.actor_user_id, a.details, a.created_at
  FROM public.agency_team_audit_log a
  LEFT JOIN public.agency_team_members m ON m.id = a.team_member_id
  WHERE a.agency_id = public.user_agency_id(auth.uid())
    AND (_member_id IS NULL OR a.team_member_id = _member_id)
    AND (
      NOT public.is_team_subuser(auth.uid())
      OR EXISTS (SELECT 1 FROM public.agency_team_permissions p
                 JOIN public.agency_team_members me ON me.id = p.team_member_id
                 WHERE me.auth_user_id = auth.uid() AND p.permission_key = 'audit.view' AND p.enabled)
    )
  ORDER BY a.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 100), 500);
$$;
REVOKE EXECUTE ON FUNCTION public.team_audit_log(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_audit_log(integer, uuid) TO authenticated, service_role;