import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu as MenuIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import {
  AGENCY_ADMIN_HOME,
  AGENCY_ADMIN_LOGIN,
  brandAccent,
  brandCssVars,
  useAgencyAdminHead,
  type AgencyAdminPortalInfo,
} from "@/lib/agencyAdmin";
import { DashboardLayoutContext } from "@/components/layout/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AgencyAdminSidebar, useSidebarCollapsed } from "./AgencyAdminSidebar";

/**
 * Shell administrativo white label. Reutiliza as páginas existentes da
 * plataforma (renderizadas como children/Outlet), mas com menu, cores e
 * marca exclusivos da agência — sem nenhum elemento visual da plataforma.
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
            collapsed ? "w-[68px]" : "w-64",
          )}
        >
          <AgencyAdminSidebar info={info} collapsed={collapsed} onToggle={toggle} />
        </aside>

        {/* Topbar mobile com gaveta */}
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
          <UserMenu />
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
            collapsed ? "lg:pl-[68px]" : "lg:pl-64",
          )}
        >
          {/* Barra superior desktop: somente recursos já existentes. */}
          <div className="hidden h-14 items-center justify-end gap-2 border-b border-border/60 bg-card/60 px-6 lg:flex xl:px-8">
            <UserMenu />
          </div>
          <div className="min-w-0 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">{children}</div>
        </main>
      </div>
    </DashboardLayoutContext.Provider>
  );
}

/** Avatar + nome do usuário com acesso ao perfil, conta e logout. */
function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["agency-admin-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { name: string | null; avatar_url: string | null } | null;
    },
  });

  const userName = profile?.name?.trim() || user?.email || "Usuário";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-muted"
          aria-label="Abrir menu do usuário"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
            <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[160px] truncate text-sm text-foreground sm:inline">
            {userName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => navigate("/gestao/perfil")}>Meu perfil</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/gestao/minha-conta")}>
          Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/gestao/suporte")}>Suporte</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate(AGENCY_ADMIN_LOGIN, { replace: true });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
