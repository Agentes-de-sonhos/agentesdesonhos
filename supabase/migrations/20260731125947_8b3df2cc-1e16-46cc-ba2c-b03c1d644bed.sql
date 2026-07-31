CREATE OR REPLACE FUNCTION public.team_get_member_detail(_member_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'id', m.id,
    'login', m.login,
    'full_name', m.full_name,
    'role_title', m.role_title,
    'notification_email', m.notification_email,
    'status', m.status,
    'last_login_at', m.last_login_at,
    'created_at', m.created_at,
    'permissions', COALESCE((
      SELECT json_agg(json_build_object('module_key', p.module_key, 'permission_key', p.permission_key, 'enabled', p.enabled))
      FROM public.agency_team_permissions p WHERE p.team_member_id = m.id
    ), '[]'::json),
    'stage_permissions', COALESCE((
      SELECT json_agg(json_build_object('pipeline_type', s.pipeline_type, 'stage_id', s.stage_id,
        'can_view', s.can_view, 'can_edit', s.can_edit, 'can_move', s.can_move))
      FROM public.agency_team_stage_permissions s WHERE s.team_member_id = m.id
    ), '[]'::json)
  )
  FROM public.agency_team_members m
  WHERE m.id = _member_id AND m.agency_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.drop_recipient_on_member_inactive()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status <> 'active' OR COALESCE(NEW.notification_email,'') = '' THEN
    DELETE FROM public.product_landing_notification_recipients
    WHERE team_member_id = NEW.id;
  ELSIF NEW.notification_email IS DISTINCT FROM OLD.notification_email THEN
    UPDATE public.product_landing_notification_recipients
    SET email = NEW.notification_email
    WHERE team_member_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drop_recipient_on_member_inactive ON public.agency_team_members;
CREATE TRIGGER trg_drop_recipient_on_member_inactive
  AFTER UPDATE ON public.agency_team_members
  FOR EACH ROW EXECUTE FUNCTION public.drop_recipient_on_member_inactive();