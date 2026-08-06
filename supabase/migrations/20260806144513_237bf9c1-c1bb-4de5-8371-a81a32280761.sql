-- Auditoria da equipe: filtros no servidor + exigência real de `audit.view`
-- (can_team já considera status ativo e devolve true para proprietário/master).
CREATE OR REPLACE FUNCTION public.team_audit_log(
  _limit integer DEFAULT 100,
  _member_id uuid DEFAULT NULL::uuid,
  _action text DEFAULT NULL::text,
  _module_key text DEFAULT NULL::text,
  _from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _to timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(id uuid, action text, module_key text, entity_type text, entity_id text, team_member_id uuid, member_name text, actor_user_id uuid, actor_is_platform_admin boolean, details jsonb, created_at timestamp with time zone)
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
    AND public.can_team('audit.view')
    AND (_member_id IS NULL OR a.team_member_id = _member_id)
    AND (_action IS NULL OR a.action = _action)
    AND (_module_key IS NULL OR a.module_key = _module_key)
    AND (_from IS NULL OR a.created_at >= _from)
    AND (_to IS NULL OR a.created_at <= _to)
  ORDER BY a.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 100), 500);
$function$;

REVOKE ALL ON FUNCTION public.team_audit_log(integer, uuid, text, text, timestamp with time zone, timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_audit_log(integer, uuid, text, text, timestamp with time zone, timestamp with time zone) TO authenticated, service_role;

-- A assinatura antiga (2 argumentos) deixa de existir para evitar caminho sem filtros.
DROP FUNCTION IF EXISTS public.team_audit_log(integer, uuid);