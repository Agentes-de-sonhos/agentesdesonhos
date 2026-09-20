ALTER TABLE public.agency_community_settings
  ADD COLUMN IF NOT EXISTS community_experience_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.agency_community_settings_get()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'community_experience_enabled', COALESCE(s.community_experience_enabled, false),
    'public_community_enabled', f.public_community_enabled,
    'internal_community_enabled', f.internal_community_enabled,
    'online_users_enabled', f.online_users_enabled,
    'internal_chat_enabled', f.internal_chat_enabled,
    'external_chat_enabled', f.external_chat_enabled,
    'preset', COALESCE(s.preset, 'full')
  )
  FROM public.agency_community_flags(public.user_agency_id(auth.uid())) f
  LEFT JOIN public.agency_community_settings s
    ON s.agency_id = public.user_agency_id(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.agency_community_settings_get() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_community_settings_get() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.agency_community_experience_save(_enabled boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _agency uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.team_can_manage_team() THEN
    RAISE EXCEPTION 'Sem permissão para alterar a experiência da comunidade da agência.';
  END IF;

  _agency := public.user_agency_id(auth.uid());

  INSERT INTO public.agency_community_settings AS s (
    agency_id, community_experience_enabled, updated_by
  ) VALUES (
    _agency, COALESCE(_enabled, false), auth.uid()
  )
  ON CONFLICT (agency_id) DO UPDATE SET
    community_experience_enabled = EXCLUDED.community_experience_enabled,
    updated_by = auth.uid(),
    updated_at = now();

  INSERT INTO public.agency_team_audit_log (
    agency_id, actor_user_id, action, module_key, details
  ) VALUES (
    _agency, auth.uid(), 'community_experience_update', 'community',
    jsonb_build_object('enabled', COALESCE(_enabled, false))
  );

  RETURN public.agency_community_settings_get();
END;
$$;
REVOKE ALL ON FUNCTION public.agency_community_experience_save(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agency_community_experience_save(boolean) TO authenticated, service_role;

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
        'community_experience_enabled', COALESCE(s.community_experience_enabled, false),
        'public_community_enabled', f.public_community_enabled,
        'internal_community_enabled', f.internal_community_enabled,
        'online_users_enabled', f.online_users_enabled,
        'internal_chat_enabled', f.internal_chat_enabled,
        'external_chat_enabled', f.external_chat_enabled
      )
      FROM public.agency_community_flags(_agency) f
      LEFT JOIN public.agency_community_settings s ON s.agency_id = _agency
    )
  ) INTO _result;

  RETURN _result;
END $$;
REVOKE EXECUTE ON FUNCTION public.team_self() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_self() TO authenticated, service_role;