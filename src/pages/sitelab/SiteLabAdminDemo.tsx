/**
 * Gestão do Site Lab.
 *
 * Não existe markup próprio aqui: o laboratório renderiza EXATAMENTE a mesma
 * camada presentacional do painel real das agências
 * (`AgencyAdminShellView` + `AgencyAdminSidebarView`), alimentada pela mesma
 * fonte única de menu (`src/lib/agencyAdminMenu.ts`).
 *
 * A seleção fica na URL protegida do laboratório
 * (`/sitelab-base/gestao?destino=...`), o que preserva voltar/avançar e o
 * recarregamento. Nunca se navega para `/gestao` real, e nenhuma ação consulta,
 * grava ou dispara qualquer automação: os dados são fixtures locais.
 */
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { agencyDisplayName, type AgencyDomainInfo } from "@/lib/agencyDomains";
import {
  AGENDA_ITEM,
  CREATE_ITEMS,
  MANAGEMENT_ITEMS,
  PROJECTS_ITEMS,
  USER_ITEMS,
  type MenuItemDef,
} from "@/lib/agencyAdminMenu";
import { AgencyAdminShellView } from "@/components/whitelabel/admin/AgencyAdminShellView";
import { AgencyAdminSidebarView } from "@/components/whitelabel/admin/AgencyAdminSidebarView";
import {
  SITELAB_ADMIN_HOME,
  SITELAB_ADMIN_PROJECTS_HREF,
  destinoSlug,
  itemForDestino,
  projectsTabFor,
  sitelabAdminHref,
  surfaceKindFor,
} from "@/lib/sitelabAdminNav";
import { SiteLabAdminSurface } from "@/pages/sitelab/SiteLabAdminSurfaces";
import { PROJECTS_ROOT } from "@/lib/agencyAdminMenu";

export default function SiteLabAdminDemo({ info }: { info: AgencyDomainInfo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const agencyName = agencyDisplayName(info);

  const destino = new URLSearchParams(location.search).get("destino");
  const activeItem = useMemo(() => itemForDestino(destino), [destino]);
  const kind = surfaceKindFor(activeItem);
  const projectsTab = projectsTabFor(activeItem);

  const onActivate = useCallback(
    (item: MenuItemDef) => {
      navigate(sitelabAdminHref(item));
    },
    [navigate],
  );

  const isActive = useCallback(
    (item: MenuItemDef) => !!activeItem && destinoSlug(activeItem.to) === destinoSlug(item.to),
    [activeItem],
  );

  return (
    <AgencyAdminShellView
      agencyName={agencyName}
      logoUrl={info.logo_url ?? null}
      homeTo={SITELAB_ADMIN_HOME}
      sidebar={({ collapsed, onToggle, onNavigate }) => (
        <AgencyAdminSidebarView
          agencyName={agencyName}
          logoUrl={info.logo_url ?? null}
          homeTo={SITELAB_ADMIN_HOME}
          createItems={CREATE_ITEMS}
          projectsItems={PROJECTS_ITEMS}
          agendaItem={AGENDA_ITEM}
          managementItems={MANAGEMENT_ITEMS}
          userItems={USER_ITEMS}
          projectsTo={SITELAB_ADMIN_PROJECTS_HREF}
          projectsActive={!!activeItem?.to.startsWith(PROJECTS_ROOT)}
          collapsed={collapsed}
          onToggle={onToggle}
          onNavigate={onNavigate}
          hrefFor={sitelabAdminHref}
          isActive={isActive}
          onActivate={(item) => {
            onActivate(item);
            onNavigate?.();
          }}
          user={{
            fullName: "Equipe do laboratório",
            roleLabel: "Demonstração",
            initials: "SL",
          }}
          /* Nenhuma sessão real: sair apenas volta para a home do laboratório. */
          onSignOut={() => navigate(SITELAB_ADMIN_HOME)}
          menuResetKey={`${location.pathname}${location.search}`}
        />
      )}
    >
      <SiteLabAdminSurface
        kind={kind}
        label={activeItem?.label ?? "Visão geral"}
        projectsTab={projectsTab}
      />
    </AgencyAdminShellView>
  );
}
