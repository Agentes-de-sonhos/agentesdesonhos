import { ReactNode } from "react";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import {
  AGENCY_ADMIN_HOME,
  brandAccent,
  brandCssVars,
  useAgencyAdminHead,
  type AgencyAdminPortalInfo,
} from "@/lib/agencyAdmin";
import { DashboardLayoutContext } from "@/components/layout/DashboardLayout";
import { TabBar } from "@/workspace/TabBar";
import { AgencyAdminSidebar } from "./AgencyAdminSidebar";
import { AgencyAdminShellView } from "./AgencyAdminShellView";
import { useAgencyBrandTheme } from "@/lib/useAgencyBrandTheme";

/**
 * Shell administrativo white label. Reutiliza as páginas existentes da
 * plataforma (renderizadas como children), mas com menu, cores e marca
 * exclusivos da agência — sem nenhum elemento visual da plataforma.
 *
 * A identidade visual vem de uma fonte única: `brandCssVars()` sobrescreve
 * localmente os tokens do design system (primary, ring, accent, sidebar…),
 * portanto todos os componentes compartilhados acompanham automaticamente a
 * cor cadastrada pela agência.
 *
 * O DashboardLayoutContext é ativado para que páginas que montam
 * <DashboardLayout> internamente virem passthrough (sem o chrome da
 * plataforma) dentro deste shell.
 */
export function AgencyAdminLayout({
  info,
  children,
}: {
  info: AgencyAdminPortalInfo;
  children: ReactNode;
}) {
  const brand = brandAccent(info.primary_color);
  const secondary = info.secondary_auto === false ? info.secondary_color ?? null : null;
  const agencyName = agencyDisplayName(info);
  const logoUrl = resolveAgencyLogoUrl(info);

  // Tema global do painel: também cobre dialogs/popovers em Portal.
  useAgencyBrandTheme(agencyBrandInput(info));

  useAgencyAdminHead(`${agencyName} | Gestão`, logoUrl);

  return (
    <DashboardLayoutContext.Provider value={true}>
      <AgencyAdminShellView
        agencyName={agencyName}
        logoUrl={logoUrl}
        homeTo={AGENCY_ADMIN_HOME}
        brandStyle={brandCssVars(brand, secondary, agencyBrandInput(info)) as React.CSSProperties}
        sidebar={({ collapsed, onToggle, onNavigate }) => (
          <AgencyAdminSidebar
            info={info}
            collapsed={collapsed}
            onToggle={onToggle}
            onNavigate={onNavigate}
          />
        )}
        tabBar={<TabBar embedded />}
      >
        {children}
      </AgencyAdminShellView>
    </DashboardLayoutContext.Provider>
  );
}
