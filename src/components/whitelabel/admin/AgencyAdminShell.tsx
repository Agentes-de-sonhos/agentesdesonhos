import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  AGENCY_ADMIN_LOGIN,
  checkAgencyAdminAccess,
  fetchAgencyAdminPortal,
} from "@/lib/agencyAdmin";
import { AgencyAdminLayout } from "./AgencyAdminLayout";
import { AgencyAdminLoading, AgencyAdminUnavailable } from "./AgencyAdminStatus";

/**
 * Guard do painel administrativo white label.
 *
 * Ordem obrigatória: (1) resolve a agência pelo hostname no servidor e
 * confirma que o painel está habilitado → (2) exige sessão → (3) confirma no
 * servidor que o usuário autenticado pertence à agência dona do domínio.
 * Qualquer falha encerra a sessão e devolve para /gestao/login do MESMO
 * domínio. URLs digitadas manualmente passam pelo mesmo guard.
 */
export function AgencyAdminShell({ hostname }: { hostname: string }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();

  const portal = useQuery({
    queryKey: ["agency-admin-portal", hostname],
    queryFn: () => fetchAgencyAdminPortal(hostname),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const info = portal.data ?? null;
  const enabled = !!info?.admin_portal_enabled;

  // Rechecagem periódica: se a conta for desativada ou perder o vínculo,
  // a sessão é derrubada em até 60s (o RPC inclui is_user_active).
  const access = useQuery({
    queryKey: ["agency-admin-access", hostname, user?.id],
    enabled: !!user && enabled,
    queryFn: () => checkAgencyAdminAccess(hostname),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
  const accessDenied = !!user && enabled && access.data === false;

  useEffect(() => {
    if (accessDenied) void signOut();
  }, [accessDenied, signOut]);

  // Estado neutro enquanto o domínio/agência é resolvido — sem nenhuma marca.
  if (authLoading || portal.isLoading) return <AgencyAdminLoading />;
  if (!info || !enabled) return <AgencyAdminUnavailable />;

  if (!user) {
    return (
      <Navigate
        to={AGENCY_ADMIN_LOGIN}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (access.isLoading || access.data === undefined || accessDenied) {
    return <AgencyAdminLoading />;
  }

  return (
    <AgencyAdminLayout info={info}>
      {/* O contexto expõe a agência resolvida às páginas exclusivas do painel. */}
      <Outlet context={{ info }} />
    </AgencyAdminLayout>
  );
}
