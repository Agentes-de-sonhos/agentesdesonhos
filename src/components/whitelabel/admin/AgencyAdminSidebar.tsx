/**
 * Menu lateral do painel administrativo white label.
 *
 * Apenas apresentação: as rotas, permissões e itens exibidos são exatamente
 * os mesmos de antes. O componente suporta os estados expandido e recolhido
 * (com tooltips) e recebe a cor da agência via tokens CSS do shell.
 */
import { useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Home,
  KanbanSquare,
  Layers,
  LifeBuoy,
  LogOut,
  Map,
  PanelLeftClose,
  Settings,
  Ticket,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { AGENCY_ADMIN_HOME, AGENCY_ADMIN_LOGIN, type AgencyAdminPortalInfo } from "@/lib/agencyAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { userInitials } from "./AgencyUserBadge";

const SIDEBAR_PREF_KEY = "wl-admin-sidebar-collapsed";

/** Preferência do usuário (desktop) para menu recolhido. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_PREF_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, collapsed ? "1" : "0");
    } catch {
      /* preferência é opcional */
    }
  }, [collapsed]);
  return { collapsed, toggle: () => setCollapsed((v) => !v) };
}

interface MenuItemDef {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
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

export function AgencyAdminSidebar({
  info,
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  info: AgencyAdminPortalInfo;
  collapsed?: boolean;
  onToggle?: () => void;
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
  const initials = userInitials(userName);

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
      icon: Ticket,
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

  const withTip = (label: string, node: React.ReactNode) =>
    collapsed ? (
      <Tooltip key={label} delayDuration={80}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : (
      node
    );

  const renderItem = (item: MenuItemDef, indented = false) => {
    const Icon = item.icon;
    const active = item.match
      ? item.match(location.pathname, location.search)
      : location.pathname === item.to;
    const node = (
      <Link
        key={item.label}
        to={item.to}
        onClick={onNavigate}
        aria-label={collapsed ? item.label : undefined}
        data-workspace-title={item.label}
        className={cn(
          "group relative flex items-center rounded-lg text-sm transition-all duration-150",
          collapsed ? "h-10 w-10 justify-center" : "gap-2.5 px-2.5 py-2",
          !collapsed && indented && "ml-3",
          active
            ? "font-medium"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        )}
        style={
          active
            ? { backgroundColor: "var(--wl-tint)", color: "var(--wl-accent)" }
            : undefined
        }
      >
        {active && !collapsed && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
            style={{ backgroundColor: "var(--wl-accent)" }}
          />
        )}
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
    return withTip(item.label, node);
  };

  const groupLabel = (label: string) =>
    collapsed ? (
      <div key={label} className="my-2 mx-auto h-px w-6 bg-border" />
    ) : (
      <p
        key={label}
        className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70"
      >
        {label}
      </p>
    );

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-card">
        {/* Cabeçalho: marca da agência */}
        <div
          className={cn(
            "flex items-center border-b border-border/70",
            collapsed ? "flex-col gap-2 px-2 py-3" : "gap-2 px-3 py-3",
          )}
        >
          <Link
            to={AGENCY_ADMIN_HOME}
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-muted/60"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={agencyName}
                className={cn("object-contain", collapsed ? "h-8 w-8" : "h-9 max-w-[140px]")}
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                style={{ backgroundColor: "var(--wl-accent)", color: "var(--wl-on-accent)" }}
              >
                {agencyName.charAt(0).toUpperCase()}
              </span>
            )}
            {!collapsed && (
              <span className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
                {agencyName}
              </span>
            )}
          </Link>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navegação principal */}
        <nav
          className={cn(
            "flex-1 space-y-0.5 overflow-y-auto py-3",
            collapsed ? "px-2 flex flex-col items-center" : "px-3",
          )}
        >
          {renderItem({
            label: "Início",
            to: AGENCY_ADMIN_HOME,
            icon: Home,
            match: (p) => p === AGENCY_ADMIN_HOME || p === "/dashboard",
          })}

          {/* Meus projetos (expansível) */}
          {collapsed
            ? withTip(
                "Meus projetos",
                <Link
                  key="projects-collapsed"
                  to="/gestao/meus-projetos"
                  onClick={onNavigate}
                  aria-label="Meus projetos"
                  data-workspace-title="Meus Projetos"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg text-sm transition-colors",
                    isProjectsArea
                      ? "font-medium"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                  style={
                    isProjectsArea
                      ? { backgroundColor: "var(--wl-tint)", color: "var(--wl-accent)" }
                      : undefined
                  }
                >
                  <FolderOpen className="h-[18px] w-[18px]" />
                </Link>,
              )
            : (
              <>
                <button
                  type="button"
                  onClick={() => setProjectsOpen((v) => !v)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    isProjectsArea
                      ? "font-medium"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                  style={isProjectsArea ? { color: "var(--wl-accent)" } : undefined}
                >
                  <FolderOpen className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 truncate text-left">Meus projetos</span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", projectsOpen && "rotate-180")}
                  />
                </button>
                {projectsOpen && (
                  <div className="space-y-0.5 border-l border-border/60 pl-1">
                    {PROJECTS_ITEMS.map((i) => renderItem(i, true))}
                  </div>
                )}
              </>
            )}

          {renderItem({
            label: "Agenda",
            to: "/gestao/agenda",
            icon: Calendar,
            match: (p) => p === "/gestao/agenda" || p === "/agenda",
          })}

          {groupLabel("Criar")}
          {CREATE_ITEMS.map((i) => renderItem(i))}

          {groupLabel("Gestão")}
          {managementItems.map((i) => renderItem(i))}
        </nav>

        {/* Rodapé do menu */}
        <div
          className={cn(
            "space-y-0.5 border-t border-border/70 py-3",
            collapsed ? "px-2 flex flex-col items-center" : "px-3",
          )}
        >
          {!collapsed && (
            <Link
              to="/gestao/perfil"
              onClick={onNavigate}
              className="mb-1 flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate text-sm text-foreground">{userName}</span>
            </Link>
          )}
          {footerItems.map((i) => renderItem(i))}
          {withTip(
            "Sair",
            <button
              key="sair"
              type="button"
              onClick={handleSignOut}
              aria-label="Sair"
              className={cn(
                "flex items-center rounded-lg text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
                collapsed ? "h-10 w-10 justify-center" : "w-full gap-2.5 px-2.5 py-2",
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>,
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
