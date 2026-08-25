import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronDown,
  FileText,
  FolderOpen,
  Home,
  KanbanSquare,
  Layers,
  LifeBuoy,
  LogOut,
  Map,
  Menu as MenuIcon,
  Settings,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import {
  AGENCY_ADMIN_HOME,
  AGENCY_ADMIN_LOGIN,
  brandAccent,
  useAgencyAdminHead,
  type AgencyAdminPortalInfo,
  type BrandAccent,
} from "@/lib/agencyAdmin";
import { DashboardLayoutContext } from "@/components/layout/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
  const brand = brandAccent(info.primary_color);
  const agencyName = agencyDisplayName(info);
  const logoUrl = resolveAgencyLogoUrl(info);

  useAgencyAdminHead(`${agencyName} | Gestão`, logoUrl);

  return (
    <DashboardLayoutContext.Provider value={true}>
      <div className="min-h-screen bg-background">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-border bg-card">
          <MenuContent info={info} brand={brand} />
        </aside>

        {/* Topbar mobile com gaveta */}
        <div className="lg:hidden sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors"
            aria-label="Abrir menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link to={AGENCY_ADMIN_HOME} className="flex min-w-0 items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt={agencyName} className="h-7 max-w-[120px] object-contain" />
            )}
            <span className="truncate text-sm font-semibold text-foreground">{agencyName}</span>
          </Link>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <MenuContent info={info} brand={brand} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Conteúdo */}
        <main className="lg:pl-72 min-w-0">
          <div className="py-4 px-4 sm:py-6 sm:px-6 xl:px-10 min-w-0">{children}</div>
        </main>
      </div>
    </DashboardLayoutContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────────────────────

interface MenuItemDef {
  label: string;
  to: string;
  icon: typeof Home;
  /** Caminhos (além de `to`) que marcam o item como ativo. */
  match?: (pathname: string, search: string) => boolean;
}

function tabMatcher(tab: string) {
  return (pathname: string, search: string) =>
    (pathname === "/gestao/meus-projetos" || pathname === "/meus-projetos") &&
    new URLSearchParams(search).get("tab") === tab;
}

const PROJECTS_ITEMS: MenuItemDef[] = [
  {
    label: "Orçamentos",
    to: "/gestao/meus-projetos?tab=orcamentos",
    icon: FileText,
    match: (p, s) =>
      (p === "/gestao/meus-projetos" || p === "/meus-projetos") &&
      (new URLSearchParams(s).get("tab") ?? "orcamentos") === "orcamentos",
  },
  { label: "Roteiros", to: "/gestao/meus-projetos?tab=roteiros", icon: Map, match: tabMatcher("roteiros") },
  {
    label: "Carteiras digitais",
    to: "/gestao/meus-projetos?tab=carteiras",
    icon: Wallet,
    match: tabMatcher("carteiras"),
  },
  { label: "Modelos", to: "/gestao/meus-projetos?tab=modelos", icon: Layers, match: tabMatcher("modelos") },
];

const CREATE_ITEMS: MenuItemDef[] = [
  {
    label: "Novo orçamento",
    to: "/gestao/criar/orcamento",
    icon: FileText,
    match: (p) => p.startsWith("/gestao/criar/orcamento") || p.startsWith("/ferramentas-ia/gerar-orcamento"),
  },
  {
    label: "Novo roteiro",
    to: "/gestao/criar/roteiro",
    icon: Map,
    match: (p) => p.startsWith("/gestao/criar/roteiro") || p.startsWith("/ferramentas-ia/criar-roteiro"),
  },
  {
    label: "Nova carteira digital",
    to: "/gestao/criar/carteira",
    icon: Wallet,
    match: (p) => p.startsWith("/gestao/criar/carteira") || p.startsWith("/ferramentas-ia/trip-wallet"),
  },
];

function MenuContent({
  info,
  brand,
  onNavigate,
}: {
  info: AgencyAdminPortalInfo;
  brand: BrandAccent;
  onNavigate?: () => void;
}) {
  const { user, signOut } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const agencyName = agencyDisplayName(info);
  const logoUrl = resolveAgencyLogoUrl(info);

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

  const isProjectsArea =
    location.pathname === "/gestao/meus-projetos" || location.pathname === "/meus-projetos";
  const [projectsOpen, setProjectsOpen] = useState(isProjectsArea);

  const handleSignOut = async () => {
    await signOut();
    navigate(AGENCY_ADMIN_LOGIN, { replace: true });
  };

  const managementItems: MenuItemDef[] = [
    {
      label: "Oportunidades",
      to: "/gestao/crm/funil",
      icon: KanbanSquare,
      match: (p) => p.includes("/funil"),
    },
    {
      label: "Operações",
      to: "/gestao/crm/operacoes",
      icon: FolderOpen,
      match: (p) => p.includes("/operacoes"),
    },
    {
      label: "Clientes",
      to: "/gestao/crm/clientes",
      icon: Users,
      match: (p) => p.includes("/clientes"),
    },
    {
      label: "Reservas",
      to: "/gestao/reservas",
      icon: Calendar,
      match: (p) => p.startsWith("/gestao/reservas"),
    },
    // Financeiro respeita integralmente a permissão existente.
    ...(can("financial.access")
      ? [
          {
            label: "Financeiro",
            to: "/gestao/financeiro",
            icon: Wallet,
            match: (p: string) => p === "/gestao/financeiro" || p === "/financeiro",
          } as MenuItemDef,
        ]
      : []),
  ];

  const footerItems: MenuItemDef[] = [
    {
      label: "Meu perfil",
      to: "/gestao/perfil",
      icon: UserCircle,
      match: (p) => p === "/gestao/perfil" || p === "/perfil",
    },
    {
      label: "Minha conta",
      to: "/gestao/minha-conta",
      icon: Settings,
      match: (p) => p === "/gestao/minha-conta" || p === "/minha-conta",
    },
    {
      label: "Suporte",
      to: "/gestao/suporte",
      icon: LifeBuoy,
      match: (p) => p === "/gestao/suporte" || p === "/suporte",
    },
  ];

  const renderItem = (item: MenuItemDef, indented = false) => {
    const Icon = item.icon;
    const active = item.match
      ? item.match(location.pathname, location.search)
      : location.pathname === item.to;
    return (
      <Link
        key={item.label}
        to={item.to}
        onClick={onNavigate}
        className={
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors " +
          (indented ? "ml-4 " : "") +
          (active ? "font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")
        }
        style={active ? { backgroundColor: brand.tint, color: brand.accent } : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho: marca da agência */}
      <div className="border-b border-border p-4 space-y-3">
        <Link
          to={AGENCY_ADMIN_HOME}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg p-1 -m-1 hover:bg-muted transition-colors"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={agencyName} className="h-9 max-w-[150px] object-contain" />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
              style={{ backgroundColor: brand.accent, color: brand.onAccent }}
            >
              {agencyName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
            {agencyName}
          </span>
        </Link>

        <Link
          to="/gestao/perfil"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg p-1.5 -m-1.5 hover:bg-muted transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
            <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate text-sm text-foreground">{userName}</span>
        </Link>
      </div>

      {/* Navegação principal */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {renderItem({
          label: "Início",
          to: AGENCY_ADMIN_HOME,
          icon: Home,
          match: (p) => p === AGENCY_ADMIN_HOME || p === "/dashboard",
        })}

        {/* Meus projetos (expansível) */}
        <button
          type="button"
          onClick={() => setProjectsOpen((v) => !v)}
          className={
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors " +
            (isProjectsArea
              ? "font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
          style={isProjectsArea ? { color: brand.accent } : undefined}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">Meus projetos</span>
          <ChevronDown
            className={"h-4 w-4 transition-transform " + (projectsOpen ? "rotate-180" : "")}
          />
        </button>
        {projectsOpen && (
          <div className="space-y-0.5">{PROJECTS_ITEMS.map((i) => renderItem(i, true))}</div>
        )}

        {renderItem({
          label: "Agenda",
          to: "/gestao/agenda",
          icon: Calendar,
          match: (p) => p === "/gestao/agenda" || p === "/agenda",
        })}

        {/* Criar — sempre aberta */}
        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Criar
        </p>
        <div className="space-y-0.5">{CREATE_ITEMS.map((i) => renderItem(i))}</div>

        {/* Gestão */}
        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Gestão
        </p>
        <div className="space-y-0.5">{managementItems.map((i) => renderItem(i))}</div>
      </nav>

      {/* Rodapé do menu */}
      <div className="border-t border-border p-3 space-y-0.5">
        {footerItems.map((i) => renderItem(i))}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

// User icon importado para possíveis extensões do rodapé; mantido para uso futuro.
void User;
void PlusCircle;
