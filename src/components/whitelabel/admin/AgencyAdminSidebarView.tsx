/**
 * Camada PRESENTACIONAL do menu lateral do painel white label.
 *
 * Este arquivo contém todo o markup do menu (cabeçalho, botão "Criar novo",
 * grupos, densidade responsiva, tooltips do modo recolhido e rodapé do
 * usuário). Ele NÃO conhece autenticação, permissões, workspace, Supabase nem
 * sessão: recebe identidade, itens já filtrados, item ativo e callbacks.
 *
 * Consumidores:
 * - `AgencyAdminSidebar` (painel real: auth, permissões, dados, abas);
 * - `SiteLabRoot` (template base: monta o painel real sob outro prefixo).
 *
 * Assim a paridade visual/comportamental é estrutural, não copiada.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  LogOut,
  PanelLeftClose,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { densityForHeight, sidebarDensity, useViewport } from "@/lib/agencyAdminDensity";
import { cn } from "@/lib/utils";
import type { MenuItemDef } from "@/lib/agencyAdminMenu";

export interface AgencyAdminSidebarUser {
  fullName: string;
  roleLabel: string;
  avatarUrl?: string;
  initials: string;
}

export interface AgencyAdminSidebarViewProps {
  /** Identidade: nome visível e logotipo já resolvido (ou nulo). */
  agencyName: string;
  logoUrl: string | null;
  /** Destino do logotipo/cabeçalho. */
  homeTo: string;
  /** Itens já filtrados por permissão, na ordem da fonte única. */
  createItems: MenuItemDef[];
  projectsItems: MenuItemDef[];
  agendaItem: MenuItemDef;
  managementItems: MenuItemDef[];
  userItems: MenuItemDef[];
  /** Link do grupo "Meus projetos" quando recolhido + estado ativo do grupo. */
  projectsTo: string;
  projectsActive: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  /** Href real de cada item (permite destinos internos do laboratório). */
  hrefFor: (item: MenuItemDef) => string;
  isActive: (item: MenuItemDef) => boolean;
  /** Ativação por popover (abas do workspace real ou seleção demonstrativa). */
  onActivate: (item: MenuItemDef) => void;
  user: AgencyAdminSidebarUser;
  onSignOut: () => void;
  /** Muda a cada troca de contexto (rota/aba) para fechar os popovers. */
  menuResetKey?: string;
}

export function AgencyAdminSidebarView({
  agencyName,
  logoUrl,
  homeTo,
  createItems,
  projectsItems,
  agendaItem,
  managementItems,
  userItems,
  projectsTo,
  projectsActive,
  collapsed = false,
  onToggle,
  onNavigate,
  hrefFor,
  isActive,
  onActivate,
  user,
  onSignOut,
  menuResetKey,
}: AgencyAdminSidebarViewProps) {
  /**
   * Densidade responsiva por ALTURA da viewport: as dimensões reais dos
   * componentes diminuem para que todo o menu caiba sem rolagem.
   */
  const { height } = useViewport();
  const d = sidebarDensity(densityForHeight(height));

  /** Fallback: fade neutro só quando ainda houver conteúdo fora da área visível. */
  const navRef = useRef<HTMLElement | null>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  /** Fallback do logotipo: se o arquivo falhar, exibe o monograma da marca. */
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!logoUrl && !logoFailed;

  /** Estados únicos dos menus, compartilhados pelas variantes expandida/recolhida. */
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(projectsActive);

  const closeSidebarMenus = useCallback(() => {
    setCreateMenuOpen(false);
    setUserMenuOpen(false);
  }, []);

  /** Garante o commit do fechamento antes de abrir/ativar outra aba. */
  const closeThenRun = useCallback(
    (action: () => void) => {
      flushSync(closeSidebarMenus);
      requestAnimationFrame(action);
    },
    [closeSidebarMenus],
  );

  const collapsedLogo =
    d.mode === "dense"
      ? "h-7 w-auto max-w-[32px]"
      : d.mode === "medium"
        ? "h-8 w-auto max-w-[34px]"
        : "h-9 w-auto max-w-[34px]";

  /** Fecha os popovers em qualquer mudança de contexto (rota/aba, colapso). */
  useEffect(() => {
    closeSidebarMenus();
  }, [menuResetKey, collapsed, closeSidebarMenus]);

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
        to={hrefFor(item)}
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
        style={
          active
            ? { backgroundColor: "var(--agency-primary-soft)", color: "var(--agency-primary)" }
            : undefined
        }
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
        className={cn("font-semibold uppercase tracking-[0.09em] text-slate-400", d.sectionLabel)}
      >
        {label}
      </p>
    );

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card" data-agency-admin-sidebar>
        {/* ── Cabeçalho: logotipo + nome da agência + recolher ───────────── */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-border/70",
            d.header,
            collapsed ? "justify-between px-0.5" : "gap-2 px-3",
          )}
        >
          <Link
            to={homeTo}
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
            {showLogo ? (
              <img
                src={logoUrl as string}
                alt={agencyName}
                onError={() => setLogoFailed(true)}
                className={cn("shrink-0 object-contain", collapsed ? collapsedLogo : d.logo)}
              />
            ) : (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[10px] text-sm font-bold",
                  d.logoCollapsed,
                )}
                style={{
                  backgroundColor: "var(--agency-primary)",
                  color: "var(--agency-primary-foreground)",
                }}
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
                      backgroundColor: createMenuOpen
                        ? "var(--agency-primary-hover)"
                        : "var(--agency-primary)",
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
                        onSelect={() => closeThenRun(() => onActivate(item))}
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
                    to={projectsTo}
                    onClick={onNavigate}
                    aria-label="Meus projetos"
                    data-workspace-title="Meus Projetos"
                    className={cn(
                      "flex w-10 items-center justify-center rounded-[10px] outline-none transition-colors",
                      d.row,
                      d.rowText,
                      projectsActive
                        ? "font-medium"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                    )}
                    style={
                      projectsActive
                        ? {
                            backgroundColor: "var(--agency-primary-soft)",
                            color: "var(--agency-primary)",
                          }
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
                      projectsActive ? "" : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900",
                    )}
                    style={projectsActive ? { color: "var(--agency-primary)" } : undefined}
                  >
                    <Folder className={cn("shrink-0", d.icon)} strokeWidth={1.8} />
                    <span className="min-w-0 flex-1 truncate text-left">Meus projetos</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-150",
                        projectsOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {projectsOpen && (
                    <div className="relative ml-4 space-y-0.5 pl-4">
                      <span aria-hidden className="absolute left-0 top-1 bottom-1 w-px bg-border" />
                      {projectsItems.map((item) => (
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

            {renderItem(agendaItem)}

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
                title={user.fullName}
                className={cn(
                  "flex items-center rounded-[10px] outline-none transition-colors duration-150 hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[var(--agency-focus-ring)]",
                  collapsed ? "h-10 w-10 justify-center" : "w-full gap-2.5 px-2 py-1.5",
                )}
              >
                <Avatar className={cn("shrink-0", d.avatar)}>
                  <AvatarImage src={user.avatarUrl} alt={user.fullName} className="object-cover" />
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--agency-primary)",
                      color: "var(--agency-primary-foreground)",
                    }}
                  >
                    {user.initials}
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
                        {user.fullName}
                      </span>
                      {d.showRole && (
                        <span className="block truncate text-xs leading-tight text-slate-500">
                          {user.roleLabel}
                        </span>
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
                      onSelect={() => closeThenRun(() => onActivate(item))}
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
                  onSelect={() => closeThenRun(onSignOut)}
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
