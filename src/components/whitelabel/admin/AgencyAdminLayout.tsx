import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon } from "lucide-react";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TabBar } from "@/workspace/TabBar";
import { cn } from "@/lib/utils";
import { AgencyAdminSidebar, useSidebarCollapsed } from "./AgencyAdminSidebar";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();
  const brand = brandAccent(info.primary_color);
  const secondary = info.secondary_auto === false ? info.secondary_color ?? null : null;
  const agencyName = agencyDisplayName(info);
  const logoUrl = resolveAgencyLogoUrl(info);

  // Tema global do painel: também cobre dialogs/popovers em Portal.
  useAgencyBrandTheme({
    primary: info.primary_color,
    secondary,
    secondaryAuto: info.secondary_auto !== false,
  });

  useAgencyAdminHead(`${agencyName} | Gestão`, logoUrl);

  return (
    <DashboardLayoutContext.Provider value={true}>
      <div
        className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-muted/40"
        style={brandCssVars(brand, secondary) as React.CSSProperties}
      >
        {/* Sidebar desktop — largura controlada dentro do shell flex */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-card transition-[width] duration-200 lg:flex",
            collapsed ? "w-16" : "w-[250px]",
          )}
        >
          <AgencyAdminSidebar info={info} collapsed={collapsed} onToggle={toggle} />
        </aside>

        {/* Área principal: usa apenas a largura restante */}
        <div className="flex min-w-0 max-w-full flex-1 flex-col">
          {/* Topbar mobile com gaveta (sem faixa de usuário) */}
          <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-card/95 px-4 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
              aria-label="Abrir menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Link to={AGENCY_ADMIN_HOME} className="flex min-w-0 flex-1 items-center gap-2">
              {logoUrl && (
                <img src={logoUrl} alt={agencyName} className="h-7 max-w-[120px] object-contain" />
              )}
              <span className="truncate text-sm font-semibold text-foreground">{agencyName}</span>
            </Link>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-72 p-0" style={brandCssVars(brand, secondary) as React.CSSProperties}>
              <AgencyAdminSidebar info={info} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Barra de abas internas: linha única, sem rolagem horizontal. */}
          <div className="sticky top-14 z-30 min-w-0 max-w-full shrink-0 overflow-hidden bg-card/95 backdrop-blur lg:top-0">
            <TabBar embedded />
          </div>
          <main className="min-w-0 max-w-full px-4 py-4 sm:px-6 sm:py-6 xl:px-8">{children}</main>

        </div>
      </div>
    </DashboardLayoutContext.Provider>
  );
}

