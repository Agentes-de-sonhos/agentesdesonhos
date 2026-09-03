/**
 * Shell PRESENTACIONAL do painel white label (larguras, cabeçalho mobile,
 * gaveta, colapso, espaçamentos e breakpoints).
 *
 * Usado pelo painel real (`AgencyAdminLayout`) e pelo laboratório
 * (`SiteLabAdminDemo`), garantindo o MESMO markup estrutural — a única
 * variação é identidade (nome, logotipo, paleta) e o conteúdo renderizado.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu as MenuIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "./useSidebarCollapsed";

export interface AgencyAdminShellViewProps {
  agencyName: string;
  logoUrl: string | null;
  /** Destino do cabeçalho mobile. */
  homeTo: string;
  /** Tokens de marca aplicados na raiz e também na gaveta (Portal). */
  brandStyle?: CSSProperties;
  /** Menu lateral: recebe o estado de colapso e o fechamento da gaveta. */
  sidebar: (opts: { collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void }) => ReactNode;
  /** Barra de abas internas (somente o painel real usa). */
  tabBar?: ReactNode;
  children: ReactNode;
}

export function AgencyAdminShellView({
  agencyName,
  logoUrl,
  homeTo,
  brandStyle,
  sidebar,
  tabBar,
  children,
}: AgencyAdminShellViewProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  /* O asset da marca pode falhar: cai para o nome, sem espaço quebrado. */
  const [logoFailed, setLogoFailed] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div
      className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-muted/40"
      style={brandStyle}
      data-agency-admin-shell
    >
      {/* Sidebar desktop — largura controlada dentro do shell flex */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-[250px]",
        )}
      >
        {sidebar({ collapsed, onToggle: toggle })}
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
          <Link to={homeTo} className="flex min-w-0 flex-1 items-center gap-2">
            {logoUrl && !logoFailed && (
              <img
                src={logoUrl}
                alt={agencyName}
                className="h-7 max-w-[120px] object-contain"
                onError={() => setLogoFailed(true)}
              />
            )}
            <span className="truncate text-sm font-semibold text-foreground">{agencyName}</span>
          </Link>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0" style={brandStyle}>
            {sidebar({ onNavigate: () => setMobileOpen(false) })}
          </SheetContent>
        </Sheet>

        {/* Barra de abas internas: linha única, sem rolagem horizontal. */}
        {tabBar && (
          <div className="sticky top-14 z-30 min-w-0 max-w-full shrink-0 overflow-hidden bg-card/95 backdrop-blur lg:top-0">
            {tabBar}
          </div>
        )}
        <main className="min-w-0 max-w-full px-4 py-4 sm:px-6 sm:py-6 xl:px-8">{children}</main>
      </div>
    </div>
  );
}
