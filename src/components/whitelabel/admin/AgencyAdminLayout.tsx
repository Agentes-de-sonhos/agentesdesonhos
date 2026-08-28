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
  const agencyName = agencyDisplayName(info);
  const logoUrl = resolveAgencyLogoUrl(info);

  useAgencyAdminHead(`${agencyName} | Gestão`, logoUrl);

  return (
    <DashboardLayoutContext.Provider value={true}>
      <div
        className="min-h-screen bg-muted/40"
        style={brandCssVars(brand) as React.CSSProperties}
      >
        {/* Sidebar desktop */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/70 bg-card transition-[width] duration-200 lg:flex",
            collapsed ? "w-16" : "w-[250px]",
          )}
        >
          <AgencyAdminSidebar info={info} collapsed={collapsed} onToggle={toggle} />
        </aside>

        {/* Topbar mobile com gaveta (sem faixa de usuário) */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/70 bg-card/95 px-4 backdrop-blur lg:hidden">
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
          <SheetContent side="left" className="w-72 p-0" style={brandCssVars(brand) as React.CSSProperties}>
            <AgencyAdminSidebar info={info} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Conteúdo */}
        <main
          className={cn(
            "min-w-0 transition-[padding] duration-200",
            collapsed ? "lg:pl-16" : "lg:pl-[250px]",
          )}
        >
          {/* Barra de abas internas (mesmo componente da plataforma principal),
              no lugar da antiga faixa fixa com nome e avatar do usuário. */}
          <div className="sticky top-0 z-30 bg-card/95 backdrop-blur lg:top-0">
            <TabBar embedded />
          </div>
          <div className="min-w-0 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">{children}</div>
        </main>
      </div>
    </DashboardLayoutContext.Provider>
  );
}
