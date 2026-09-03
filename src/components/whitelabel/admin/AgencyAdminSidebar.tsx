/**
 * Menu lateral do painel administrativo white label.
 *
 * Somente apresentação/navegação: rotas, permissões e handlers são os mesmos
 * já existentes. Links são âncoras reais dentro de <aside>/<nav> ou de um
 * container marcado com `data-workspace-menu`, portanto o interceptador do
 * workspace (WorkspaceShell) os transforma em abas internas — sem duplicar a
 * lógica de abas e respeitando o limite de 10 páginas.
 *
 * Toda a identidade visual vem dos tokens `--agency-*` / `--wl-*` definidos
 * pelo shell a partir da cor cadastrada pela agência: nada de cor fixa aqui.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Folder,
  FolderOpen,
  Headphones,
  
  KanbanSquare,
  Layers,
  LogOut,
  Map,
  PanelLeftClose,
  Plus,
  Ticket,
  UserCog,
  UserRound,
  UsersRound,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamSession } from "@/contexts/TeamSessionContext";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { AGENCY_ADMIN_HOME, AGENCY_ADMIN_LOGIN, type AgencyAdminPortalInfo } from "@/lib/agencyAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPersonInitials } from "@/components/shared/ClientAvatar";
import { densityForHeight, sidebarDensity, useViewport } from "@/lib/agencyAdminDensity";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/workspace/WorkspaceProvider";


const SIDEBAR_PREF_KEY = "wl-admin-sidebar-collapsed";

/**
 * Preferência do usuário (desktop) para menu recolhido. Em larguras muito
 * reduzidas o painel inicia recolhido sem apagar a preferência manual salva
 * para resoluções maiores.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const pref = localStorage.getItem(SIDEBAR_PREF_KEY);
      if (pref === "1") return true;
      if (pref === "0") return false;
      return typeof window !== "undefined" && window.innerWidth < 1280;
    } catch {
      return false;
    }
  });
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) return;
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, collapsed ? "1" : "0");
    } catch {
      /* preferência é opcional */
    }
  }, [collapsed, touched]);
  return {
    collapsed,
    toggle: () => {
      setTouched(true);
      setCollapsed((v) => !v);
    },
  };
}


interface MenuItemDef {
  label: string;
  to: string;
  icon: LucideIcon;
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
    icon: WalletCards,
    match: tabMatcher("carteiras"),
  },
  { label: "Modelos", to: "/gestao/meus-projetos?tab=modelos", icon: Layers, match: tabMatcher("modelos") },
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
  const { member, accessProfile } = useTeamSession();
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const agencyName = agencyDisplayName(info);
  const logoUrl = resolveAgencyLogoUrl(info);

  /**
   * Densidade responsiva por ALTURA da viewport: as dimensões reais dos
   * componentes (cabeçalho, botão, linhas, fontes, ícones, rodapé) diminuem
   * para que todo o menu caiba sem rolagem em telas mais baixas.
   */
  const { height } = useViewport();
  const d = sidebarDensity(densityForHeight(height));

  /** Fallback: fade neutro só quando ainda houver conteúdo fora da área visível. */
  const navRef = useRef<HTMLElement | null>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);


  /** Estados únicos dos menus, compartilhados pelas variantes expandida/recolhida. */
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const closeSidebarMenus = useCallback(() => {
    setCreateMenuOpen(false);
    setUserMenuOpen(false);
  }, []);

  /** Garante o commit do fechamento antes de abrir/ativar outra aba. */
  const closeThenNavigate = useCallback(
    (action: () => void) => {
      flushSync(closeSidebarMenus);
      requestAnimationFrame(action);
    },
    [closeSidebarMenus],
  );

  const openOrActivate = useCallback(
    (item: MenuItemDef) => {
      closeThenNavigate(() => {
        if (workspace) workspace.openOrActivateTab(item.to, item.label);
        else navigate(item.to);
        onNavigate?.();
      });
    },
    [closeThenNavigate, navigate, onNavigate, workspace],
  );

  /** Logotipo do menu recolhido: maior, proporcional e sem overflow (aside = 64px). */
  const collapsedLogo =
    d.mode === "dense" ? "h-7 w-auto max-w-[32px]" : d.mode === "medium" ? "h-8 w-auto max-w-[34px]" : "h-9 w-auto max-w-[34px]";

  /** Fecha os popovers em qualquer mudança de contexto (rota/aba, colapso, etc.). */
  useEffect(() => {
    closeSidebarMenus();
  }, [location.pathname, location.search, collapsed, workspace?.activeId, closeSidebarMenus]);


  const { data: profile } = useQuery({
    queryKey: ["agency-admin-profile", user?.id],
    enabled: !!user?.id,
    /* Nome/foto do rodapé precisam refletir a edição do perfil imediatamente. */
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { name: string | null; avatar_url: string | null } | null;
    },
  });

  /** Nome oficial: perfil salvo → sessão de equipe → fallback pelo e-mail. */
  const emailFallback = (user?.email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const fullName =
    profile?.name?.trim() || member?.full_name?.trim() || emailFallback || "Usuário";
  const initials = getPersonInitials(fullName);
  const avatarUrl = profile?.avatar_url || member?.avatar_url || undefined;

  const roleLabel = member?.role_title?.trim() || accessProfile?.name?.trim() || "Administrador";

  const isProjectsArea =
    location.pathname === "/gestao/meus-projetos" || location.pathname === "/meus-projetos";
  // Grupos recolhíveis permanecem fechados quando não contêm a página ativa.
  const [projectsOpen, setProjectsOpen] = useState(isProjectsArea);

  // Detecta se a navegação ainda transborda (mesmo no modo mais compacto).
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const check = () => setHasMoreBelow(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [collapsed, d.mode, projectsOpen]);


  const handleSignOut = () => {
    closeThenNavigate(() => {
      void (async () => {
        await signOut();
        navigate(AGENCY_ADMIN_LOGIN, { replace: true });
      })();
    });
  };

  // ── Itens: fonte única compartilhada com o Site Lab (mesma ordem) ───────
  const createItems = filterMenuByPermission(CREATE_ITEMS, can);
  const managementItems = filterMenuByPermission(MANAGEMENT_ITEMS, can);
  const userItems = USER_ITEMS;


  const isActive = (item: MenuItemDef) =>
    item.match ? item.match(location.pathname, location.search) : location.pathname === item.to;

  const withTip = (label: string, node: ReactNode) =>
    collapsed ? (
      <Tooltip key={label} delayDuration={80}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right" align="center" sideOffset={8} className="z-[9999]">
          {label}
        </TooltipContent>

      </Tooltip>
    ) : (
      node
    );

  /** Linha de navegação (altura/fonte/ícone vêm da densidade atual). */
  const renderItem = (item: MenuItemDef, opts: { sub?: boolean } = {}) => {
    const Icon = item.icon;
    const active = isActive(item);
    const node = (
      <Link
        key={item.label}
        to={item.to}
        onClick={onNavigate}
        aria-label={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        data-workspace-title={item.label}
        title={collapsed ? undefined : item.label}
        className={cn(
          "group relative flex items-center rounded-[10px] outline-none transition-colors duration-150",
          "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--agency-focus-ring)]",
          d.row,
          d.rowText,
          collapsed ? "w-10 justify-center" : "gap-2.5 px-3",
          active
            ? "font-medium"
            : cn(
                "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                opts.sub && "font-normal",
              ),
        )}
        style={active ? { backgroundColor: "var(--agency-primary-soft)", color: "var(--agency-primary)" } : undefined}
      >
        {active && !collapsed && (
          <span
            aria-hidden
            className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
            style={{ backgroundColor: "var(--agency-primary)" }}
          />
        )}
        <Icon className={cn("shrink-0", d.icon)} strokeWidth={1.8} />
        {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
      </Link>
    );
    return withTip(item.label, node);
  };

  /** Opção dentro dos popovers (hover/focus com a cor da agência). */
  const popoverItemClass =
    "flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm text-slate-700 outline-none transition-colors duration-150 hover:bg-[var(--agency-primary-soft)] hover:text-[var(--agency-primary)] focus-visible:bg-[var(--agency-primary-soft)] focus-visible:text-[var(--agency-primary)]";

  const sectionLabel = (label: string) =>
    collapsed ? (
      <div key={label} className="mx-auto my-1.5 h-px w-6 bg-border" />
    ) : (
      <p
        key={label}
        className={cn(
          "font-semibold uppercase tracking-[0.09em] text-slate-400",
          d.sectionLabel,
        )}
      >
        {label}
      </p>
    );


  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
        {/* ── Cabeçalho: logotipo + nome da agência + recolher ───────────── */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-border/70",
            d.header,
            collapsed ? "justify-between px-0.5" : "gap-2 px-3",
          )}
        >
          <Link
            to={AGENCY_ADMIN_HOME}
            onClick={() => {
              closeSidebarMenus();
              onNavigate?.();
            }}
            data-workspace-title="Inicial"
            title={agencyName}
            className={cn(
              "flex min-w-0 flex-1 items-center rounded-[10px] outline-none transition-colors hover:bg-slate-100/70 focus-visible:ring-2 focus-visible:ring-[var(--agency-focus-ring)]",
              collapsed ? "justify-center p-0.5" : "gap-2 p-1",
            )}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={agencyName}
                className={cn("shrink-0 object-contain", collapsed ? collapsedLogo : d.logo)}
              />
            ) : (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[10px] text-sm font-bold",
                  d.logoCollapsed,
                )}
                style={{ backgroundColor: "var(--agency-primary)", color: "var(--agency-primary-foreground)" }}
              >
                {agencyName.charAt(0).toUpperCase()}
              </span>
            )}
            {!collapsed && (
              <span
                className={cn(
                  "min-w-0 truncate pr-1 font-medium leading-tight text-slate-900",
                  d.agencyText,
                )}
              >
                {agencyName}
              </span>
            )}
          </Link>
          {onToggle && (
            <button
              type="button"
              onClick={() => {
                closeSidebarMenus();
                onToggle();
              }}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className={cn(
                "hidden shrink-0 items-center justify-center rounded-[10px] text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[var(--agency-focus-ring)] lg:flex",
                collapsed ? "mr-0 h-6 w-6" : "h-8 w-8",
              )}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* ── Navegação: densidade primeiro; rolagem invisível só como fallback ── */}
        <div className="relative min-h-0 flex-1">
        <nav
          ref={navRef}
          className={cn(
            "no-scrollbar h-full overflow-y-auto overflow-x-hidden",
            d.gap,
            d.navPadding,
            collapsed ? "flex flex-col items-center px-2" : "px-4",
          )}
        >

          {/* Criar novo */}
          <DropdownMenu
            open={createMenuOpen}
            onOpenChange={(open) => {
              setCreateMenuOpen(open);
              if (open) setUserMenuOpen(false);
            }}
          >

            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <button
                  type="button"
                  aria-label="Criar novo"
                  aria-haspopup="menu"
                  aria-expanded={createMenuOpen}
                  className={cn(
                    "mt-0.5 flex w-10 items-center justify-center rounded-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--agency-focus-ring)]",
                    d.createBtn,
                  )}
                  style={{
                    backgroundColor: "var(--agency-primary)",
                    color: "var(--agency-primary-foreground)",
                  }}
                >
                  <Plus className={d.icon} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={createMenuOpen}
                  className={cn(
                    "mt-0.5 flex w-full items-center gap-2 rounded-[10px] px-3.5 font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--agency-focus-ring)]",
                    d.createBtn,
                    d.rowText,
                  )}
                  style={{
                    backgroundColor:
                      createMenuOpen ? "var(--agency-primary-hover)" : "var(--agency-primary)",
                    color: "var(--agency-primary-foreground)",
                  }}
                >
                  <Plus className={cn("shrink-0", d.icon)} />
                  <span className="min-w-0 flex-1 truncate text-center">Criar novo</span>
                  <ChevronUp
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-150",
                      createMenuOpen ? "rotate-0" : "rotate-180",
                    )}
                  />
                </button>
              )}


            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side={collapsed ? "right" : "bottom"}
              sideOffset={6}
              data-workspace-menu
              className="w-[var(--radix-popover-trigger-width)] min-w-[216px] rounded-xl border-border/70 p-1.5 shadow-md"
            >
              <div role="menu" className="space-y-0.5">
                {createItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.label}
                      onSelect={() => openOrActivate(item)}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className={popoverItemClass}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {sectionLabel("Meu trabalho")}

          {/* Meus projetos — grupo expansível */}
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
                    "flex w-10 items-center justify-center rounded-[10px] outline-none transition-colors",
                    d.row,
                    d.rowText,
                    isProjectsArea ? "font-medium" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  )}
                  style={
                    isProjectsArea
                      ? { backgroundColor: "var(--agency-primary-soft)", color: "var(--agency-primary)" }
                      : undefined
                  }
                >
                  <Folder className={d.icon} strokeWidth={1.8} />
                </Link>,
              )
            : (
              <>
                <button
                  type="button"
                  onClick={() => setProjectsOpen((v) => !v)}
                  aria-expanded={projectsOpen}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[10px] px-3 font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--agency-focus-ring)]",
                    d.row,
                    d.rowText,
                    isProjectsArea ? "" : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900",
                  )}
                  style={isProjectsArea ? { color: "var(--agency-primary)" } : undefined}
                >
                  <Folder className={cn("shrink-0", d.icon)} strokeWidth={1.8} />
                  <span className="min-w-0 flex-1 truncate text-left">Meus projetos</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 transition-transform duration-150", projectsOpen && "rotate-180")}
                  />
                </button>

                {projectsOpen && (
                  <div className="relative ml-4 space-y-0.5 pl-4">
                    <span aria-hidden className="absolute left-0 top-1 bottom-1 w-px bg-border" />
                    {PROJECTS_ITEMS.map((item) => (
                      <div key={item.label} className="relative">
                        <span
                          aria-hidden
                          className="absolute -left-4 top-1/2 h-1.5 w-1.5 -translate-x-[2px] -translate-y-1/2 rounded-full bg-border"
                        />
                        {renderItem(item, { sub: true })}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          {renderItem({
            label: "Agenda",
            to: "/gestao/agenda",
            icon: CalendarDays,
            match: (p) => p === "/gestao/agenda" || p === "/agenda",
          })}

          {sectionLabel("Gestão")}
          {managementItems.map((item) => renderItem(item))}
        </nav>
        {/* Fade neutro: só quando ainda há itens fora da área visível. */}
        {hasMoreBelow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent"
          />
        )}
        </div>

        {/* ── Rodapé fixo: bloco compacto do usuário ────────────────────── */}
        <div
          className={cn(
            "shrink-0 border-t border-border/70",
            d.footer,
            collapsed ? "px-2" : "px-3",
          )}
        >
          <DropdownMenu
            open={userMenuOpen}
            onOpenChange={(open) => {
              setUserMenuOpen(open);
              if (open) setCreateMenuOpen(false);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu do usuário"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                title={fullName}
                className={cn(
                  "flex items-center rounded-[10px] outline-none transition-colors duration-150 hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[var(--agency-focus-ring)]",
                  collapsed ? "h-10 w-10 justify-center" : "w-full gap-2.5 px-2 py-1.5",
                )}
              >
                <Avatar className={cn("shrink-0", d.avatar)}>
                  <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--agency-primary)",
                      color: "var(--agency-primary-foreground)",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 text-left">
                      <span
                        className={cn(
                          "block truncate font-medium leading-tight text-slate-900",
                          d.rowText,
                        )}
                      >
                        {fullName}
                      </span>
                      {d.showRole && (
                        <span className="block truncate text-xs leading-tight text-slate-500">{roleLabel}</span>
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150",
                        userMenuOpen && "rotate-180",
                      )}
                    />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              sideOffset={8}
              data-workspace-menu
              className="w-[var(--radix-popover-trigger-width)] min-w-[216px] rounded-xl border-border/70 p-1.5 shadow-md"
            >
              <div role="menu" className="space-y-0.5">
                {userItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.label}
                      onSelect={() => openOrActivate(item)}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className={popoverItemClass}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}
                <div className="my-1 h-px bg-border/70" />
                <DropdownMenuItem
                  onSelect={handleSignOut}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm text-destructive outline-none transition-colors duration-150 hover:bg-destructive/10 focus-visible:bg-destructive/10"
                >
                  <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                  <span>Sair</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
