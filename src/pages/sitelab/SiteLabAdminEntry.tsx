/**
 * Gestão do SiteLab Base — montada FORA de qualquer router do App.
 *
 * O painel real (`AgencyAdminArea`) usa o workspace de abas, e cada aba tem o
 * seu próprio router. Por isso ele precisa ser decidido antes do router do App,
 * exatamente como `AgencyDomainRoutes` já faz nos domínios das agências: assim
 * existe um único workspace/router ativo, sem Router dentro de Router.
 *
 * Nada muda no isolamento: o guard real resolve o tenant técnico pelo hostname
 * e exige a conta técnica do laboratório.
 */
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgencyDomain } from "@/lib/agencyDomains";
import { SITELAB_BASE, SITELAB_BASE_PATH } from "@/lib/sitelabModels";
import { hasSitelabAccess, revokeSitelabAccess } from "@/lib/sitelabAccess";
import {
  PasswordGate,
  SiteLabFallback,
  SiteLabTopBar,
  useNoIndex,
  useSiteLabModel,
} from "./SiteLabChrome";

const SiteLabPresentationEditor = lazy(() => import("./SiteLabPresentationEditor"));

/** Tela de apresentação comercial (exclusiva do laboratório, só navegador). */
export const SITELAB_PRESENTATION_PATH = `${SITELAB_BASE_PATH}/gestao/apresentacao`;

const AgencyAdminArea = lazy(
  () => import("@/components/whitelabel/admin/AgencyAdminArea"),
);

export default function SiteLabAdminEntry() {
  const model = useSiteLabModel();
  const [granted, setGranted] = useState(() => hasSitelabAccess(SITELAB_BASE.slug));

  useNoIndex(`${model.name} — template base`);
  const presentation =
    window.location.pathname.replace(/\/+$/, "") === SITELAB_PRESENTATION_PATH;

  // Pré-aquece o tenant técnico pelo mesmo RPC das agências (o painel real
  // resolve o seu próprio contexto; aqui é apenas cache compartilhado).
  useQuery({
    queryKey: ["sitelab-tenant", model.adminHostname],
    queryFn: () => fetchAgencyDomain(model.adminHostname),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    setGranted(hasSitelabAccess(SITELAB_BASE.slug));
  }, []);

  const exit = useCallback(() => {
    revokeSitelabAccess(SITELAB_BASE.slug);
    setGranted(false);
  }, []);

  if (!granted) {
    return <PasswordGate model={model} onGranted={() => setGranted(true)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteLabTopBar model={model} view="admin" onExit={exit} useAnchors />
      {/* Navegação real (fora de router): Painel ↔ Apresentação. */}
      <nav className="border-b bg-background" aria-label="Gestão do laboratório">
        <div className="mx-auto flex max-w-6xl gap-1 px-4 py-2 text-sm">
          <a
            href={`${SITELAB_BASE_PATH}/gestao`}
            aria-current={presentation ? undefined : "page"}
            className={`rounded-md px-3 py-1.5 ${presentation ? "text-muted-foreground hover:bg-muted" : "bg-muted font-semibold"}`}
          >
            Painel
          </a>
          <a
            href={SITELAB_PRESENTATION_PATH}
            aria-current={presentation ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${presentation ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted"}`}
          >
            Apresentação
          </a>
        </div>
      </nav>
      <Suspense fallback={<SiteLabFallback />}>
        {presentation ? (
          <SiteLabPresentationEditor />
        ) : (
          <AgencyAdminArea
            hostname={model.adminHostname}
            basePath={SITELAB_BASE_PATH}
            /* SiteLab vive dentro do router principal do App. */
            hasOuterRouter
          />
        )}
      </Suspense>
    </div>
  );
}
