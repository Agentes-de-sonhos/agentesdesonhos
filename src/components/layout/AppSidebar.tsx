import React, { useState, useCallback, useMemo, useRef, Fragment } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Map,
  Newspaper,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Cloud,
  LogOut,
  Shield,
  Megaphone,
  MonitorPlay,
  Plane,
  Users,
  GraduationCap,
  Lock,
  Calculator,
  MessageCircleQuestion,
  Store,
  CreditCard,
  Wallet,
  StickyNote,
  Home,
  BookOpen,
  Compass,
  CalendarDays,
  BookMarked,
  Tag,
  ShoppingCart,
  PlusCircle,
  FileText,
  Route,
  Heart,
  Paintbrush,
  UserPlus,
  Headset,
  Building2,
  DollarSign,
  ArrowDownCircle,
  ShoppingBag,
  ArrowUpCircle,
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  Rss,
  User,
  Receipt,
  MoreHorizontal,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useGamificationLite } from "@/hooks/useGamificationLite";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Feature } from "@/types/subscription";
import { usePermissions } from "@/hooks/usePermissions";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { useFullMenuOrder } from "@/hooks/useFullMenuOrder";
import { ComingSoonDialog } from "@/components/subscription/ComingSoonDialog";
import { isSectionHiddenForUser, isItemHiddenForUser } from "@/lib/sidebarVisibility";
import { CLIENTES_DIRECT_ITEM, FINANCEIRO_DIRECT_ITEM } from "@/config/directNavItems";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature?: Feature;
  adminOnly?: boolean;
  isPremium?: boolean;
  isHighlighted?: boolean;
  key?: string;
  requiredPermission?: string;
  /** Only match the exact pathname (avoids parent/child URL collisions). */
  exactUrl?: boolean;
  /** Marca o item como ativo em qualquer rota que comece com este prefixo. */
  activePrefix?: string;
  /** Basta uma destas permissões de equipe para exibir o item. */
  anyPermission?: string[];
  /** Expandable group of child tools (no route of its own). */
  children?: MenuItem[];
  /** Renderiza o item com aparência de cabeçalho de seção (caixa alta + cor temática). */
  sectionStyle?: {
    headerBg: string;
    headerHoverBg: string;
    hoverColor: string;
  };
}

interface MenuSection {
  title: string;
  key?: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  hoverColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  headerBg: string;
  headerHoverBg: string;
}

// ── Static sections ──

const conhecimentoSection: MenuSection = {
  title: "Conhecimento",
  key: "section_conhecimento",
  icon: BookOpen,
  hoverColor: "hover:bg-blue-600 hover:text-white",
  headerBg: "bg-blue-600 text-white",
  headerHoverBg: "hover:bg-blue-700",
  bgColor: "bg-blue-50",
  textColor: "text-blue-700",
  borderColor: "border-blue-600",
  items: [
    { key: "educa_academy", title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { key: "cursos_mentorias", title: "Cursos e Mentorias", url: "/cursos", icon: MonitorPlay },
    { key: "noticias", title: "Notícias do Trade", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
  ],
};
const meusProjetosItem: MenuItem = { key: "meus_projetos", title: "Meus Projetos", url: "/meus-projetos", icon: FolderOpen };
const comunidadeItem: MenuItem = { key: "comunidade", title: "Comunidade", url: "/comunidade", icon: Heart };

const guiasSection: MenuSection = {
  title: "Guias e Referências",
  key: "section_guias",
  icon: BookMarked,
  hoverColor: "hover:bg-emerald-600 hover:text-white",
  headerBg: "bg-emerald-600 text-white",
  headerHoverBg: "hover:bg-emerald-700",
  bgColor: "bg-emerald-50",
  textColor: "text-emerald-700",
  borderColor: "border-emerald-600",
  items: [
    { key: "mapa_turismo", title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
    { key: "beneficios", title: "Benefícios e Descontos", url: "/beneficios", icon: Tag, requiredFeature: "benefits" },
    { key: "requisitos_viagem", title: "Central de Requisitos", url: "/requisitos-viagem", icon: Shield, requiredFeature: "travel_requirements", isPremium: true },
    { key: "hotel_raio_x", title: "Raio-X do Hotel", url: "/hotel-raio-x", icon: Building2, requiredFeature: "hotel_raio_x" },
    { key: "travel_advisor", title: "Travel Advisor", url: "/dream-advisor", icon: Compass, requiredFeature: "travel_advisor" },
  ],
};

const recursosVendasSection: MenuSection = {
  title: "Recursos de Vendas",
  key: "section_recursos_vendas",
  icon: ShoppingCart,
  hoverColor: "hover:bg-orange-600 hover:text-white",
  headerBg: "bg-orange-600 text-white",
  headerHoverBg: "hover:bg-orange-700",
  bgColor: "bg-orange-50",
  textColor: "text-orange-700",
  borderColor: "border-orange-600",
  items: [
    { key: "bloqueios_aereos", title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane, requiredFeature: "flight_blocks" },
    { key: "materiais", title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone, requiredFeature: "materials" },
  ],
};

const criarSection: MenuSection = {
  title: "Criar",
  key: "section_criar",
  icon: PlusCircle,
  hoverColor: "hover:bg-violet-600 hover:text-white",
  headerBg: "bg-violet-600 text-white",
  headerHoverBg: "hover:bg-violet-700",
  bgColor: "bg-violet-50",
  textColor: "text-violet-700",
  borderColor: "border-violet-600",
  items: [
    { key: "carteira_digital", title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet, requiredFeature: "trip_wallet" },
    { key: "orcamento", title: "Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator" },
    { key: "roteiros", title: "Roteiros", url: "/ferramentas-ia/criar-roteiro", icon: Route, requiredFeature: "itinerary" },
    { key: "bloco_notas", title: "Bloco de Notas", url: "/bloco-notas", icon: StickyNote, requiredFeature: "notepad" },
  ],
};

// Gestão de Clientes e Gestão Financeira são links diretos (sem submenu).
const clientesItem: MenuItem = {
  key: CLIENTES_DIRECT_ITEM.key,
  title: CLIENTES_DIRECT_ITEM.title,
  url: CLIENTES_DIRECT_ITEM.url,
  activePrefix: CLIENTES_DIRECT_ITEM.activePrefix,
  icon: Users,
  requiredFeature: CLIENTES_DIRECT_ITEM.requiredFeature as Feature,
  anyPermission: CLIENTES_DIRECT_ITEM.anyPermission,
  sectionStyle: CLIENTES_DIRECT_ITEM.theme,
};

const financeiroItem: MenuItem = {
  key: FINANCEIRO_DIRECT_ITEM.key,
  title: FINANCEIRO_DIRECT_ITEM.title,
  url: FINANCEIRO_DIRECT_ITEM.url,
  activePrefix: FINANCEIRO_DIRECT_ITEM.activePrefix,
  icon: DollarSign,
  requiredFeature: FINANCEIRO_DIRECT_ITEM.requiredFeature as Feature,
  anyPermission: FINANCEIRO_DIRECT_ITEM.anyPermission,
  sectionStyle: FINANCEIRO_DIRECT_ITEM.theme,
};

const marketingSection: MenuSection = {
  title: "Ferramentas de Marketing",
  key: "section_marketing",
  icon: Megaphone,
  hoverColor: "hover:bg-pink-600 hover:text-white",
  headerBg: "bg-pink-600 text-white",
  headerHoverBg: "hover:bg-pink-700",
  bgColor: "bg-pink-50",
  textColor: "text-pink-700",
  borderColor: "border-pink-600",
  items: [
    { key: "paginas_vendas", title: "Páginas de vendas personalizadas", url: "/meus-leads/landings", icon: Globe, requiredFeature: "lead_capture" },
    { key: "captacao_leads", title: "Formulário conversacional", url: "/meus-leads", icon: UserPlus, requiredFeature: "lead_capture", exactUrl: true },
    { key: "cartao_visitas", title: "Cartão de visitas", url: "/meu-cartao", icon: CreditCard, requiredFeature: "business_card" },
    {
      key: "outras_marketing",
      title: "Outras",
      url: "",
      icon: MoreHorizontal,
      children: [
        { key: "vitrine_ofertas", title: "Vitrine de ofertas", url: "/minha-vitrine", icon: Store, requiredFeature: "showcase" },
        { key: "conteudo", title: "Legendas, Stories e WhatsApp", url: "/ferramentas-ia/criar-conteudo", icon: FileText, requiredFeature: "content_creator" },
        { key: "personalizador_laminas", title: "Personalizador de lâminas", url: "/personalizador-laminas", icon: Paintbrush, requiredFeature: "lamina_customizer" },
      ],
    },
  ],
};

const mentoriasItem: MenuItem = { key: "cursos_mentorias", title: "Cursos e Mentorias", url: "/cursos", icon: GraduationCap };

const dashboardItem: MenuItem = { key: "inicio", title: "Início", url: "/dashboard", icon: Home };
const startDashboardItem: MenuItem = { key: "inicio", title: "Início", url: "/dashboard-start", icon: Home };
const minhaAgendaItem: MenuItem = { key: "agenda", title: "Minha Agenda", url: "/agenda", icon: CalendarDays };
const meuPerfilItem: MenuItem = { key: "meu_perfil", title: "Meu Perfil", url: "/perfil", icon: User };


// Custom section shown ONLY for Start plan users (always at the top)
const planoStartSection: MenuSection = {
  title: "Plano Start",
  key: "section_plano_start",
  icon: Sparkles,
  hoverColor: "hover:bg-amber-500 hover:text-white",
  headerBg: "bg-amber-500 text-white",
  headerHoverBg: "hover:bg-amber-600",
  bgColor: "bg-amber-50",
  textColor: "text-amber-700",
  borderColor: "border-amber-500",
  items: [
    { key: "start_mapa_turismo", title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map },
    { key: "start_radar_turismo", title: "Radar do Turismo", url: "/noticias", icon: Rss },
    { key: "start_educa_academy", title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { key: "start_materiais", title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone },
    { key: "start_criar_roteiros", title: "Criar Roteiros", url: "/ferramentas-ia/criar-roteiro", icon: Route },
    { key: "start_agenda", title: "Minha Agenda", url: "/agenda", icon: CalendarDays },
  ],
};


const minhaContaMenuItem: MenuItem = { title: "Minha Conta", url: "/minha-conta", icon: CreditCard };
const suporteMenuItem: MenuItem = { title: "Suporte", url: "/suporte", icon: Headset };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean | undefined>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean | undefined>>({});
  const [userInteracted, setUserInteracted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, isFornecedor } = useUserRole();
  const { hasFeature, plan, isPromotor } = useSubscription();
  const { hasFeatureAccess } = useFeatureAccess();
  const { trackSectionVisit } = useGamificationLite();
  const { can: canPerm, isTeamMember } = usePermissions();

  // Filtra itens por permissão de equipe (master bypassa)
  const isPermittedForTeam = useCallback((item: MenuItem) => {
    if (!isTeamMember) return true;
    // Itens adicionais sempre liberados para subusuários da equipe
    // (Criar: carteira digital, orçamento, roteiros)
    const TEAM_ALLOWED_KEYS = new Set([
      "carteira_digital",
      "orcamento",
      "roteiros",
    ]);
    if (item.key && TEAM_ALLOWED_KEYS.has(item.key)) return true;
    if (item.anyPermission?.length) return item.anyPermission.some((p) => canPerm(p));
    // Para team member: só mostra itens com requiredPermission liberado
    if (!item.requiredPermission) return false;
    return canPerm(item.requiredPermission);
  }, [isTeamMember, canPerm]);

  // Hover-to-expand on desktop with delayed expand/collapse to avoid accidental open/close
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  };

  const handleSidebarMouseEnter = () => {
    clearTimers();
    if (collapsed) {
      expandTimerRef.current = setTimeout(() => {
        setCollapsed(false);
      }, 700);
    }
  };

  const handleSidebarMouseLeave = () => {
    clearTimers();
    collapseTimerRef.current = setTimeout(() => {
      setCollapsed(true);
    }, 300);
  };

  /** Expande imediatamente, cancelando timers/estados pendentes de hover. */
  const expandNow = useCallback(() => {
    clearTimers();
    setCollapsed(false);
  }, []);

  const isEducaPass = !isPromotor && plan === "educa_pass";
  const isCartaoDigital = !isPromotor && plan === "cartao_digital";
  const isRestrictedPlan = isEducaPass || isCartaoDigital;
  const isStartPlan = !isPromotor && plan === "start";
  // Team members inherit the master's agency context — do not show plan-specific UI.
  const showStartPlanSection = isStartPlan && !isTeamMember;

  // URLs locked specifically for Start plan users (shows lock icon + opens upgrade dialog)
  const startPlanLockedUrls = useMemo(
    () => new Set([
      "/comunidade",
      "/cursos",
      "/beneficios",
    ]),
    []
  );

  const allSections: MenuSection[] = useMemo(
    () => [conhecimentoSection, guiasSection, recursosVendasSection, criarSection, marketingSection],
    []
  );

  const standaloneItems: MenuItem[] = useMemo(
    () => [clientesItem, financeiroItem],
    []
  );

  const { orderMap } = useFullMenuOrder();

  type MenuEntry =
    | { type: "section"; section: MenuSection; orderIdx: number }
    | { type: "item"; item: MenuItem; orderIdx: number };

  const orderedEntries: MenuEntry[] = useMemo(() => {
    const mainOrder = orderMap["main"] || {};
    const entries: MenuEntry[] = [];

    for (const section of allSections) {
      if (isSectionHiddenForUser(section.key, isAdmin, plan)) continue;
      const filteredItems = section.items
        .filter(isPermittedForTeam)
        .filter((it) => !isItemHiddenForUser(it.key, isAdmin, plan));
      if (filteredItems.length === 0) continue;
      // Ferramentas de Marketing tem hierarquia fixa (com o grupo "Outras"),
      // portanto não é reordenada pela configuração administrativa.
      const sortedItems = section.key === "section_marketing" ? filteredItems : filteredItems.sort((a, b) => {
        const sectionKey = section.key?.replace("section_", "") || "";
        const sectionOrder = orderMap[sectionKey] || {};
        return (sectionOrder[a.key || ""] ?? 999) - (sectionOrder[b.key || ""] ?? 999);
      });
      // Start plan: pin specific items to first place in their sections
      // (the only enabled item is highlighted on top)
      if (isStartPlan) {
        const pinFirstByKey: Record<string, string> = {
          section_criar: "roteiros",
          section_recursos_vendas: "materiais",
        };
        const pinKey = pinFirstByKey[section.key || ""];
        if (pinKey) {
          const idx = sortedItems.findIndex((it) => it.key === pinKey);
          if (idx > 0) {
            const [pinned] = sortedItems.splice(idx, 1);
            sortedItems.unshift(pinned);
          }
        }
      }
      entries.push({
        type: "section",
        section: { ...section, items: sortedItems },
        orderIdx: mainOrder[section.key || ""] ?? 999,
      });
    }

    for (const item of standaloneItems) {
      if (isSectionHiddenForUser(item.key, isAdmin, plan)) continue;
      if (isItemHiddenForUser(item.key, isAdmin, plan)) continue;
      if (!isPermittedForTeam(item)) continue;
      entries.push({
        type: "item",
        item,
        orderIdx: mainOrder[item.key || ""] ?? 999,
      });
    }

    const sorted = entries.sort((a, b) => a.orderIdx - b.orderIdx);

    // Start plan users get a custom "Plano Start" section pinned to the top
    if (showStartPlanSection) {
      return [
        { type: "section" as const, section: planoStartSection, orderIdx: -1 },
        ...sorted,
      ];
    }

    return sorted;
  }, [allSections, standaloneItems, orderMap, isStartPlan, showStartPlanSection, isPermittedForTeam, isAdmin, plan]);

  const toggleSection = (title: string) => {
    setUserInteracted(true);
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[title];
      const allClosed: Record<string, boolean | undefined> = {};
      if (!isCurrentlyOpen) {
        allClosed[title] = true;
      }
      return allClosed;
    });
  };

  const isItemActive = (itemUrl: string, exact?: boolean) => {
    if (!itemUrl) return false;
    const [pathname, search] = itemUrl.split("?");
    if (search) {
      return location.pathname === pathname && location.search === `?${search}`;
    }
    if (exact) return location.pathname === itemUrl;
    return location.pathname === itemUrl || location.pathname.startsWith(itemUrl);
  };

  const isItemOrChildActive = (item: MenuItem): boolean =>
    item.children
      ? item.children.some((c) => isItemActive(c.url, c.exactUrl))
      : isItemActive(item.url, item.exactUrl);

  const isSectionActive = (section: MenuSection) => section.items.some(isItemOrChildActive);

  const handleMenuClick = useCallback(
    (item: MenuItem, e: React.MouseEvent) => {
      // Sidebar recolhida: o clique apenas expande (evita clique fantasma na transição)
      if (collapsed) {
        e.preventDefault();
        expandNow();
        return;
      }
      // Educa Pass: only allow EducaTravel Academy
      if (isEducaPass && item.url !== "/educa-academy") {
        e.preventDefault();
        setShowComingSoon(true);
        return;
      }
      // Cartão Digital Pass: only allow specific pages
      if (isCartaoDigital && item.url !== "/meu-cartao" && item.url !== "/perfil") {
        e.preventDefault();
        setShowComingSoon(true);
        return;
      }
      // Start plan: lock specific premium areas
      if (isStartPlan && startPlanLockedUrls.has(item.url)) {
        e.preventDefault();
        setUpgradeFeature(item.requiredFeature ?? "crm_basic");
        return;
      }
      if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
        e.preventDefault();
        setUpgradeFeature(item.requiredFeature);
        return;
      }
      trackSectionVisit(item.url);
      setCollapsed(true);
    },
    [hasFeature, trackSectionVisit, isEducaPass, isCartaoDigital, isStartPlan, startPlanLockedUrls, collapsed, expandNow]
  );

  const cartaoDigitalAllowedUrls = ["/meu-cartao", "/perfil", "/dashboard", "/mentorias"];

  const renderSingleItem = (item: MenuItem, sectionBgColor?: string, sectionTextColor?: string, sectionBorderColor?: string, forceShowLock?: boolean) => {
    if (item.children) {
      return renderGroupItem(item, sectionBgColor, sectionTextColor, sectionBorderColor);
    }
    const isActive =
      isItemActive(item.url, item.exactUrl) ||
      (!!item.activePrefix && location.pathname.startsWith(item.activePrefix)) ||
      (item.url === "/dashboard" && location.pathname === "/");
    const isLockedByPlan = item.requiredFeature && !hasFeature(item.requiredFeature);
    const isLockedByEducaPass = isEducaPass && item.url !== "/educa-academy";
    const isLockedByCartaoDigital = isCartaoDigital && !cartaoDigitalAllowedUrls.includes(item.url);
    const isLockedByStart = isStartPlan && startPlanLockedUrls.has(item.url);
    const isLocked = isLockedByPlan || isLockedByEducaPass || isLockedByCartaoDigital || isLockedByStart;
    const showLockIcon = isLocked || forceShowLock;

    const sectionStyle = item.sectionStyle;
    const menuLink = (
      <Link
        key={item.url}
        to={isLocked ? "#" : item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-300",
          collapsed ? "py-1" : "py-1.5",
          sectionStyle
            ? isActive && !isLocked
              ? cn(sectionStyle.headerBg, sectionStyle.headerHoverBg, "font-semibold")
              : isLocked
                ? "opacity-60 cursor-pointer hover:opacity-70 text-sidebar-foreground"
                : cn("text-sidebar-foreground", sectionStyle.hoverColor)
          : isActive && !isLocked && sectionBgColor
            ? cn(sectionBgColor, sectionTextColor, "border-l-[3px]", sectionBorderColor, "font-semibold")
            : isActive && !isLocked
              ? "bg-muted text-foreground font-semibold shadow-sm"
              : isLocked
                ? "opacity-60 cursor-pointer hover:opacity-70 text-sidebar-foreground"
                : sectionBgColor
                  ? cn(sectionBgColor, sectionTextColor, "hover:scale-[1.02] hover:font-semibold")
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
      >
        <div className="relative flex-shrink-0">
          <item.icon
            className={cn(
              sectionStyle ? "h-4 w-4 transition-all duration-300" : "h-5 w-5 transition-all duration-300",
              isActive && !isLocked && !sectionBgColor && !sectionStyle && "text-foreground",
              isLocked && "text-muted-foreground"
            )}
          />
          {showLockIcon && (
            <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />
          )}
        </div>
        {!collapsed && (
          <>
            <span
              className={cn(
                "truncate flex-1",
                sectionStyle && "text-[11px] font-bold uppercase tracking-wider text-left whitespace-nowrap",
                isLocked && "text-muted-foreground"
              )}
            >
              {item.title}
            </span>
            {item.isHighlighted && !isActive && !isLocked && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.url}>
          <TooltipTrigger asChild>{menuLink}</TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
            <p className="text-sm font-medium">{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuLink;
  };

  const renderGroupItem = (
    group: MenuItem,
    sectionBgColor?: string,
    sectionTextColor?: string,
    sectionBorderColor?: string
  ) => {
    const children = group.children ?? [];
    const childActive = children.some((c) => isItemActive(c.url, c.exactUrl));
    const groupId = `menu-group-${group.key}`;
    const isOpen = openGroups[group.key || group.title] ?? childActive;
    const GroupIcon = group.icon;

    return (
      <div key={group.key || group.title} className="flex flex-col">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={groupId}
          onClick={() =>
            setOpenGroups((prev) => ({
              ...prev,
              [group.key || group.title]: !isOpen,
            }))
          }
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-300 w-full text-left",
            collapsed ? "py-1" : "py-1.5",
            childActive && sectionBgColor
              ? cn(sectionBgColor, sectionTextColor, "border-l-[3px]", sectionBorderColor, "font-semibold")
              : sectionBgColor
                ? cn(sectionBgColor, sectionTextColor, "hover:font-semibold")
                : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          <GroupIcon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="truncate flex-1">{group.title}</span>
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
              )}
            </>
          )}
        </button>
        {isOpen && !collapsed && (
          <nav
            id={groupId}
            className="flex flex-col gap-0.5 mt-0.5 ml-4 pl-2 border-l border-border/60 animate-fade-in [&_a]:text-[13px]"
          >
            {children.map((child) => (
              <Fragment key={child.url}>
                {renderSingleItem(child, sectionBgColor, sectionTextColor, sectionBorderColor)}
              </Fragment>
            ))}
          </nav>
        )}
      </div>
    );
  };

  const renderSection = (section: MenuSection) => {
    const isActive = isSectionActive(section);
    const hasExplicitState = section.title in openSections;
    const isOpen = hasExplicitState ? !!openSections[section.title] : (!userInteracted && isActive);
    const Icon = section.icon;

    if (collapsed) {
      return (
        <nav key={section.title} className="flex flex-col gap-[2px] px-3">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "group flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-300 w-full",
                      isActive
                        ? cn(section.headerBg)
                        : cn("text-sidebar-foreground", section.hoverColor)
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
                <p className="text-sm font-medium">{section.title}</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="right" align="start" className="w-64 p-2" sideOffset={8}>
              <p className={cn(
                "text-[11px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg whitespace-nowrap",
                section.headerBg
              )}>
                {section.title}
              </p>
              <nav className="flex flex-col gap-0.5 mt-1">
                {section.items
                  .filter((item) => !item.adminOnly || isAdmin || (item.key && hasFeatureAccess(item.key)))
                  .flatMap((item) =>
                    item.children
                      ? [
                          { item, depth: 0, isGroupLabel: true as const },
                          ...item.children.map((child) => ({ item: child, depth: 1, isGroupLabel: false as const })),
                        ]
                      : [{ item, depth: 0, isGroupLabel: false as const }]
                  )
                  .map(({ item, depth, isGroupLabel }) => {
                  if (isGroupLabel) {
                    return (
                      <p
                        key={`group-${item.key}`}
                        className="flex items-center gap-2 px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.title}
                      </p>
                    );
                  }
                  const itemActive = isItemActive(item.url, item.exactUrl);
                  const isLockedByFeature = item.requiredFeature && !hasFeature(item.requiredFeature);
                  const isLockedByCartao = isCartaoDigital && !cartaoDigitalAllowedUrls.includes(item.url);
                  const isLockedByEduca = isEducaPass && item.url !== "/educa-academy";
                  const isLocked = isLockedByFeature || isLockedByCartao || isLockedByEduca;
                  return (
                    <Link
                      key={item.url}
                      to={isLocked ? "#" : item.url}
                      onClick={(e) => handleMenuClick(item, e)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200",
                        depth > 0 && "ml-3 text-[13px]",
                        itemActive && !isLocked
                          ? cn(section.bgColor, section.textColor, "border-l-[3px]", section.borderColor, "font-semibold")
                          : isLocked
                            ? "opacity-60 cursor-pointer hover:opacity-70"
                            : cn(section.bgColor, section.textColor, "hover:scale-[1.02] hover:font-semibold"),
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <item.icon className="h-4 w-4" />
                        {isLocked && (
                          <Lock className="h-2 w-2 absolute -top-0.5 -right-0.5 text-warning" />
                        )}
                      </div>
                      <span className="truncate flex-1">{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </PopoverContent>
          </Popover>
        </nav>
      );
    }

    return (
      <div key={section.title} className="px-3">
        <button
          onClick={() => toggleSection(section.title)}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200",
            isOpen
              ? cn(section.headerBg, section.headerHoverBg)
              : cn("text-sidebar-foreground", section.hoverColor)
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider flex-1 text-left whitespace-nowrap">
            {section.title}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isOpen ? "rotate-180 text-white/70" : "text-muted-foreground/50"
            )}
          />
        </button>
        {isOpen && (
          <nav className="flex flex-col gap-0.5 mt-0.5 animate-fade-in">
            {section.items.filter((item) => !item.adminOnly || isAdmin || (item.key && hasFeatureAccess(item.key))).map((item) => renderSingleItem(item, section.bgColor, section.textColor, section.borderColor))}
          </nav>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        id="app-sidebar"
        style={{ '--sidebar-current-width': collapsed ? '64px' : '288px' } as React.CSSProperties}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 flex-col hidden lg:flex",
          collapsed ? "w-16" : "w-72"
        )}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 flex-shrink-0">
          <Link to={isStartPlan ? "/dashboard-start" : "/dashboard"} data-workspace-title="Inicial" className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl gradient-primary">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in min-w-0">
                <h1 className="font-display text-base font-semibold text-sidebar-foreground whitespace-nowrap">
                  Agentes de Sonhos
                </h1>
              </div>
            )}
          </Link>
        </div>

        {/* Toggle visual removido: o hover sobre o menu já expande/recolhe automaticamente */}

        {/* Scrollable Navigation */}
        <div className={cn("flex-1 py-2", collapsed ? "overflow-hidden space-y-[2px]" : "overflow-y-auto space-y-0.5")}>
          {/* Início */}
          <nav className={cn("flex flex-col", collapsed ? "gap-[2px] px-3" : "gap-0.5 px-3")}>
            {renderSingleItem(meusProjetosItem)}
            {renderSingleItem(minhaAgendaItem)}
            {renderSingleItem(meuPerfilItem)}
            {!isTeamMember && renderSingleItem(comunidadeItem)}
          </nav>

          <div className={cn("px-3", collapsed ? "py-0.5" : "py-1")}>
            <Separator className="bg-sidebar-border" />
          </div>

          {/* Dynamic menu entries ordered by DB */}
          {orderedEntries.map((entry) => {
            if (entry.type === "section") {
              return <Fragment key={entry.section.key || entry.section.title}>{renderSection(entry.section)}</Fragment>;
            }
            return (
              <nav key={entry.item.key || entry.item.url} className={cn("flex flex-col", collapsed ? "items-center gap-[2px] px-2" : "gap-0.5 px-3")}>
                {renderSingleItem(entry.item)}
              </nav>
            );
          })}
        </div>

        {/* Bottom Section - Compact */}
        <div className={cn("flex-shrink-0 border-t border-sidebar-border px-3", collapsed ? "py-1 space-y-[2px]" : "py-2 space-y-0.5")}>
          {isAdmin && renderSingleItem(adminMenuItem)}

          {collapsed ? (
            <div className="flex flex-col items-center gap-[2px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/suporte"
                    className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  >
                    <Headset className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
                  <p className="text-sm font-medium">Suporte</p>
                </TooltipContent>
              </Tooltip>
              {!isFornecedor && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/minha-conta"
                      className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
                    <p className="text-sm font-medium">Minha Conta</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-6 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
                  <p className="text-sm font-medium">Sair</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <Link
                  to="/suporte"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors whitespace-nowrap"
                >
                  <Headset className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">Suporte</span>
                </Link>
                {!isFornecedor && (
                  <Link
                    to="/minha-conta"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors whitespace-nowrap"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">Minha Conta</span>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs whitespace-nowrap"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  <span className="whitespace-nowrap">Sair</span>
                </Button>
              </div>
              <div className="text-center pt-1">
                <Link to="/atualizacoes" className="text-[9px] text-muted-foreground/50 hover:text-primary transition-colors">
                  v1.0 Beta · Nobre Digital
                </Link>
              </div>
            </>
          )}
        </div>
      </aside>

      <UpgradeDialog
        open={upgradeFeature !== null}
        onOpenChange={(open) => !open && setUpgradeFeature(null)}
        requiredFeature={upgradeFeature || undefined}
      />
      <ComingSoonDialog
        open={showComingSoon}
        onOpenChange={setShowComingSoon}
      />
    </TooltipProvider>
  );
}
