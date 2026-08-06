ALTER TABLE public.agency_team_audit_log
  ADD COLUMN IF NOT EXISTS actor_is_platform_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.agency_team_limit_overrides
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP FUNCTION IF EXISTS public.team_audit_log(integer, uuid);

CREATE OR REPLACE FUNCTION public.team_audit_log(_limit integer DEFAULT 100, _member_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  id uuid, action text, module_key text, entity_type text, entity_id text,
  team_member_id uuid, member_name text, actor_user_id uuid,
  actor_is_platform_admin boolean, details jsonb, created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.action, a.module_key, a.entity_type, a.entity_id,
    a.team_member_id, m.full_name, a.actor_user_id, a.actor_is_platform_admin,
    a.details, a.created_at
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
$function$;