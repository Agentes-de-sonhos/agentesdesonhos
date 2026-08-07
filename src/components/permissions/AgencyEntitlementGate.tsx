import { ReactNode } from "react";
import {
  useAgencyEntitlements,
  type AgencyEntitlementKey,
} from "@/hooks/useAgencyEntitlements";

interface Props {
  entitlement: AgencyEntitlementKey | string;
  children: ReactNode;
  /** Conteúdo alternativo quando a agência não possui o entitlement. */
  fallback?: ReactNode;
  /** Enquanto carrega, renderiza isto (padrão: nada). */
  loadingFallback?: ReactNode;
}

/**
 * Renderiza `children` apenas se a AGÊNCIA atual possuir o entitlement.
 * Não considera plano de assinatura — Premium não recebe VIP implicitamente.
 */
export function AgencyEntitlementGate({
  entitlement,
  children,
  fallback = null,
  loadingFallback = null,
}: Props) {
  const { hasAgencyEntitlement, loading } = useAgencyEntitlements();
  if (loading) return <>{loadingFallback}</>;
  if (!hasAgencyEntitlement(entitlement)) return <>{fallback}</>;
  return <>{children}</>;
}
