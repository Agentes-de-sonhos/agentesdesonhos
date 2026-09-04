import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { fetchAgencyDomain } from "@/lib/agencyDomains";
import { SITELAB_BASE, SITELAB_BASE_PATH, type SiteLabView } from "@/lib/sitelabModels";
import { hasSitelabAccess, revokeSitelabAccess } from "@/lib/sitelabAccess";
import {
  PasswordGate,
  SiteLabFallback,
  SiteLabTopBar,
  sitelabTenantInfo,
  useNoIndex,
  useSiteLabModel,
} from "./SiteLabChrome";

const AgencySiteHome = lazy(() => import("@/pages/whitelabel/AgencySiteHome"));
/* Áreas internas: as PRÓPRIAS páginas reais do white label, sem versão paralela. */
const AgencyClientArea = lazy(() => import("@/pages/whitelabel/AgencyClientArea"));

/**
 * Site e Área do Cliente do laboratório.
 *
 * REGRA DO SITE LAB: ele é o CONSUMIDOR MESTRE do mesmo template das agências
 * (AgencySiteHome/AgencySiteLayout, AgencyClientArea, AgencyAdminArea). Não é
 * staging, não gera cópias e não existe etapa de "promover para as agências":
 * uma melhoria no núcleo compartilhado chega no mesmo deploy aqui e em todos os
 * tenants. Só a identidade (nome, logo, paleta) varia.
 *
 * A GESTÃO fica em `SiteLabAdminEntry`, montada antes do router do App porque o
 * painel real usa o workspace de abas (um router por aba).
 */
export default function SiteLabRoot({ view = "site" }: { view?: SiteLabView }) {
  const location = useLocation();
  const model = useSiteLabModel();
  const [granted, setGranted] = useState(() => hasSitelabAccess(SITELAB_BASE.slug));

  useNoIndex(`${model.name} — template base`);

  // Tenant TÉCNICO do laboratório, resolvido no servidor pelo mesmo RPC das
  // agências. Nunca usa dados de uma agência real.
  const tenant = useQuery({
    queryKey: ["sitelab-tenant", model.adminHostname],
    queryFn: () => fetchAgencyDomain(model.adminHostname),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // A sessão vale para as três áreas por até 8 horas.
  useEffect(() => {
    setGranted(hasSitelabAccess(SITELAB_BASE.slug));
  }, [location.pathname]);

  const exit = useCallback(() => {
    revokeSitelabAccess(SITELAB_BASE.slug);
    setGranted(false);
  }, []);

  if (!granted) {
    return <PasswordGate model={model} onGranted={() => setGranted(true)} />;
  }

  const info = sitelabTenantInfo(model, tenant.data ?? null);

  return (
    <div className="min-h-screen bg-white">
      <SiteLabTopBar model={model} view={view} onExit={exit} />
      <Suspense fallback={<SiteLabFallback />}>
        {view === "clientArea" ? (
          /* Página real: login, sessão, navegação e dados são os do white label. */
          <AgencyClientArea info={info} basePath={`${SITELAB_BASE_PATH}/area-do-cliente`} />
        ) : (
          <AgencySiteLayout info={info}>
            <AgencySiteHome info={info} />
          </AgencySiteLayout>
        )}
      </Suspense>
    </div>
  );
}
