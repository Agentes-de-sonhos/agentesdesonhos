import { useAgencyEntitlements } from "@/hooks/useAgencyEntitlements";
import { usePermissions } from "@/hooks/usePermissions";
import { BLOG_ENTITLEMENT, BLOG_PERMISSION } from "@/lib/blog/blogUtils";

/**
 * Acesso de interface ao módulo Site → Blog. A autoridade final é o servidor
 * (RLS `blog_can_manage`: agência do usuário + permissão + recurso ativo).
 */
export function useSiteBlogAccess() {
  const { hasAgencyEntitlement, agencyId, loading } = useAgencyEntitlements();
  const { can } = usePermissions();
  const enabled = hasAgencyEntitlement(BLOG_ENTITLEMENT);
  return { enabled, canManage: enabled && can(BLOG_PERMISSION), agencyId, loading };
}
