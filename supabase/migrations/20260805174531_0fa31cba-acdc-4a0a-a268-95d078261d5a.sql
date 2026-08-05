CREATE OR REPLACE FUNCTION public.team_get_member_detail(_member_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  WHERE m.id = _member_id AND m.agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.team_get_member_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_get_member_detail(uuid) TO authenticated, service_role;