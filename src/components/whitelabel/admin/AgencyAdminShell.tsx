import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  AGENCY_ADMIN_FROM_KEY,
  AGENCY_ADMIN_LOGIN,
  checkAgencyAdminAccess,
  fetchAgencyAdminPortal,
  type AgencyAdminPortalInfo,
} from "@/lib/agencyAdmin";
import { AgencyAdminLoading, AgencyAdminUnavailable } from "./AgencyAdminStatus";

/**
 * Guard do painel administrativo white label.
 *
 * Ordem obrigatória: (1) resolve a agência pelo hostname no servidor e
 * confirma que o painel está habilitado → (2) exige sessão → (3) confirma no
 * servidor que o usuário autenticado pertence à agência dona do domínio.
 * Qualquer falha encerra a sessão e devolve para /gestao/login do MESMO
 * domínio. URLs digitadas manualmente passam pelo mesmo guard.
 *
 * O guard não renderiza layout: entrega a agência resolvida via render prop
 * para que a área interna monte o shell com abas (workspace).
 */
export function AgencyAdminShell({
  hostname,
  children,
}: {
  hostname: string;
  children: (info: AgencyAdminPortalInfo) => ReactNode;
}) {
  const { user, loading: authLoading, signOut } = useAuth();

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
    // Sem router externo aqui (o workspace usa routers de memória): a volta
    // para o login é uma navegação real do MESMO domínio, guardando o destino
    // pretendido para o pós-login.
    try {
      sessionStorage.setItem(
        AGENCY_ADMIN_FROM_KEY,
        `${window.location.pathname}${window.location.search}`,
      );
    } catch {
      /* storage indisponível: apenas segue para o login */
    }
    window.location.replace(AGENCY_ADMIN_LOGIN);
    return <AgencyAdminLoading />;
  }

  if (access.isLoading || access.data === undefined || accessDenied) {
    return <AgencyAdminLoading />;
  }

  return <>{children(info)}</>;
}
