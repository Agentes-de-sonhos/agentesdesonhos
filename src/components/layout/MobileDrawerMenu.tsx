import React, { useState, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Map, Newspaper, User, Cloud, LogOut, Shield, Megaphone, Plane, Users,
  GraduationCap, Lock, Calculator, Heart, ChevronDown, MessageCircleQuestion,
  Store, CreditCard, Wallet, Home, BookOpen, Compass, CalendarDays, BookMarked,
  Tag, ShoppingCart, PlusCircle, FileText, Route, Paintbrush, UserPlus, Headset,
  X, Building2, FolderOpen, DollarSign, ShoppingBag, ArrowUpCircle, ArrowDownCircle, LayoutDashboard,
  Sparkles, Rss,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useGamificationLite } from "@/hooks/useGamificationLite";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Feature } from "@/types/subscription";
import { useFullMenuOrder } from "@/hooks/useFullMenuOrder";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { ComingSoonDialog } from "@/components/subscription/ComingSoonDialog";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature?: Feature;
  adminOnly?: boolean;
  isPremium?: boolean;
  isHighlighted?: boolean;
  key?: string;
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

const conhecimentoSection: MenuSection = {
  title: "Conhecimento", key: "section_conhecimento", icon: BookOpen,
  hoverColor: "hover:bg-blue-600 hover:text-white", headerBg: "bg-blue-600 text-white", headerHoverBg: "hover:bg-blue-700",
  bgColor: "bg-blue-50", textColor: "text-blue-700", borderColor: "border-blue-600",
  items: [
    { key: "educa_academy", title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { key: "noticias", title: "Notícias do Trade", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
  ],
};

const meusProjetosItem: MenuItem = { key: "meus_projetos", title: "Meus Projetos", url: "/meus-projetos", icon: FolderOpen };
const comunidadeItem: MenuItem = { key: "comunidade", title: "Comunidade", url: "/comunidade", icon: Heart };

const guiasSection: MenuSection = {
  title: "Guias e Referências", key: "section_guias", icon: BookMarked,
  hoverColor: "hover:bg-emerald-600 hover:text-white", headerBg: "bg-emerald-600 text-white", headerHoverBg: "hover:bg-emerald-700",
  bgColor: "bg-emerald-50", textColor: "text-emerald-700", borderColor: "border-emerald-600",
  items: [
    { key: "mapa_turismo", title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
    { key: "travel_advisor", title: "Travel Advisor", url: "/dream-advisor", icon: Compass },
    { key: "beneficios", title: "Benefícios e Descontos", url: "/beneficios", icon: Tag, requiredFeature: "community" },
    { key: "agenda", title: "Minha Agenda", url: "/agenda", icon: CalendarDays },
  ],
};

const recursosVendasSection: MenuSection = {
  title: "Recursos de Vendas", key: "section_recursos_vendas", icon: ShoppingCart,
  hoverColor: "hover:bg-orange-600 hover:text-white", headerBg: "bg-orange-600 text-white", headerHoverBg: "hover:bg-orange-700",
  bgColor: "bg-orange-50", textColor: "text-orange-700", borderColor: "border-orange-600",
  items: [
    { key: "bloqueios_aereos", title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane },
    { key: "materiais", title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone, requiredFeature: "materials" },
    { key: "hotel_raio_x", title: "Raio-X do Hotel", url: "/hotel-raio-x", icon: Building2 },
  ],
};

const criarSection: MenuSection = {
  title: "Criar", key: "section_criar", icon: PlusCircle,
  hoverColor: "hover:bg-violet-600 hover:text-white", headerBg: "bg-violet-600 text-white", headerHoverBg: "hover:bg-violet-700",
  bgColor: "bg-violet-50", textColor: "text-violet-700", borderColor: "border-violet-600",
  items: [
    { key: "carteira_digital", title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet, requiredFeature: "trip_wallet" },
    { key: "orcamento", title: "Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator" },
    { key: "roteiros", title: "Roteiros", url: "/ferramentas-ia/criar-roteiro", icon: Route, requiredFeature: "itinerary" },
    { key: "conteudo", title: "Conteúdo", url: "/ferramentas-ia/criar-conteudo", icon: FileText, requiredFeature: "content_creator" },
  ],
};

const clientesSection: MenuSection = {
  title: "Clientes", key: "section_clientes", icon: Users,
  hoverColor: "hover:bg-cyan-600 hover:text-white", headerBg: "bg-cyan-600 text-white", headerHoverBg: "hover:bg-cyan-700",
  bgColor: "bg-cyan-50", textColor: "text-cyan-700", borderColor: "border-cyan-600",
  items: [
    { key: "gestao_clientes", title: "Gestão de Clientes", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic" },
    { key: "oportunidades", title: "Oportunidades", url: "/gestao-clientes/funil", icon: ShoppingCart, requiredFeature: "crm_basic" },
    { key: "meta_vendas", title: "Meta de Vendas", url: "/gestao-clientes/metas", icon: Calculator, requiredFeature: "financial" },
  ],
};

const financeiroSection: MenuSection = {
  title: "Financeiro", key: "section_financeiro", icon: DollarSign,
  hoverColor: "hover:bg-emerald-600 hover:text-white", headerBg: "bg-emerald-600 text-white", headerHoverBg: "hover:bg-emerald-700",
  bgColor: "bg-emerald-50", textColor: "text-emerald-700", borderColor: "border-emerald-600",
  items: [
    { key: "vendas_fin", title: "Vendas", url: "/financeiro?tab=vendas", icon: ShoppingBag, requiredFeature: "financial" },
    { key: "entradas", title: "Entradas", url: "/financeiro?tab=entradas", icon: ArrowUpCircle, requiredFeature: "financial" },
    { key: "despesas", title: "Despesas", url: "/financeiro?tab=despesas", icon: ArrowDownCircle, requiredFeature: "financial" },
    { key: "dashboard_fin", title: "Dashboard", url: "/financeiro?tab=dashboard", icon: LayoutDashboard, requiredFeature: "financial" },
  ],
};

const marketingSection: MenuSection = {
  title: "Marketing", key: "section_marketing", icon: Megaphone,
  hoverColor: "hover:bg-pink-600 hover:text-white", headerBg: "bg-pink-600 text-white", headerHoverBg: "hover:bg-pink-700",
  bgColor: "bg-pink-50", textColor: "text-pink-700", borderColor: "border-pink-600",
  items: [
    { key: "cartao_visitas", title: "Cartão de Visitas", url: "/meu-cartao", icon: CreditCard },
    { key: "vitrine_ofertas", title: "Vitrine de Ofertas", url: "/minha-vitrine", icon: Store },
    { key: "personalizador_laminas", title: "Personalizador de Lâminas", url: "/personalizador-laminas", icon: Paintbrush },
    { key: "captacao_leads", title: "Captação de Leads", url: "/meus-leads", icon: UserPlus },
  ],
};

const mentoriasItem: MenuItem = { key: "cursos_mentorias", title: "Cursos e Mentorias", url: "/cursos", icon: GraduationCap };
const dashboardItem: MenuItem = { key: "inicio", title: "Início", url: "/dashboard", icon: Home };
const startDashboardItem: MenuItem = { key: "inicio", title: "Início", url: "/dashboard-start", icon: Home };

// Custom section for Start plan users (always pinned to top)
const planoStartSection: MenuSection = {
  title: "Plano Start", key: "section_plano_start", icon: Sparkles,
  hoverColor: "hover:bg-amber-500 hover:text-white", headerBg: "bg-amber-500 text-white", headerHoverBg: "hover:bg-amber-600",
  bgColor: "bg-amber-50", textColor: "text-amber-700", borderColor: "border-amber-500",
  items: [
    { key: "start_mapa_turismo", title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map },
    { key: "start_radar_turismo", title: "Radar do Turismo", url: "/noticias", icon: Rss },
    { key: "start_educa_academy", title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { key: "start_materiais", title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone },
    { key: "start_agenda", title: "Minha Agenda", url: "/agenda", icon: CalendarDays },
  ],
};

const profileMenuItem: MenuItem = { title: "Perfil", url: "/perfil", icon: User };
const suporteMenuItem: MenuItem = { title: "Suporte", url: "/suporte", icon: Headset };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

interface MobileDrawerMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawerMenu({ open, onClose }: MobileDrawerMenuProps) {
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean | undefined>>({});
  const [userInteracted, setUserInteracted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan, isPromotor } = useSubscription();
  const { hasFeatureAccess } = useFeatureAccess();
  const { trackSectionVisit } = useGamificationLite();

  const isEducaPass = !isPromotor && plan === "educa_pass";
  const isCartaoDigital = !isPromotor && plan === "cartao_digital";
  const isStartPlan = !isPromotor && plan === "start";

  const allSections: MenuSection[] = useMemo(
    () => [conhecimentoSection, guiasSection, recursosVendasSection, criarSection, clientesSection, financeiroSection, marketingSection],
    []
  );

  const standaloneItems: MenuItem[] = useMemo(
    () => [meusProjetosItem, comunidadeItem, mentoriasItem],
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
      const sortedItems = [...section.items].sort((a, b) => {
        const sectionKey = section.key?.replace("section_", "") || "";
        const sectionOrder = orderMap[sectionKey] || {};
        return (sectionOrder[a.key || ""] ?? 999) - (sectionOrder[b.key || ""] ?? 999);
      });
      entries.push({
        type: "section",
        section: { ...section, items: sortedItems },
        orderIdx: mainOrder[section.key || ""] ?? 999,
      });
    }

    for (const item of standaloneItems) {
      entries.push({
        type: "item",
        item,
        orderIdx: mainOrder[item.key || ""] ?? 999,
      });
    }

    const sorted = entries.sort((a, b) => a.orderIdx - b.orderIdx);

    if (isStartPlan) {
      return [
        { type: "section" as const, section: planoStartSection, orderIdx: -1 },
        ...sorted,
      ];
    }

    return sorted;
  }, [allSections, standaloneItems, orderMap, isStartPlan]);

  const cartaoDigitalAllowedUrls = ["/meu-cartao", "/perfil", "/dashboard", "/mentorias"];

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

  const isSectionActive = (section: MenuSection) =>
    section.items.some((i) => location.pathname === i.url || location.pathname.startsWith(i.url));

  const handleMenuClick = useCallback(
    (item: MenuItem, e: React.MouseEvent) => {
      if (isEducaPass && item.url !== "/educa-academy") {
        e.preventDefault();
        setShowComingSoon(true);
        return;
      }
      if (isCartaoDigital && !cartaoDigitalAllowedUrls.includes(item.url)) {
        e.preventDefault();
        setShowComingSoon(true);
        return;
      }
      if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
        e.preventDefault();
        setUpgradeFeature(item.requiredFeature);
        return;
      }
      trackSectionVisit(item.url);
      onClose();
      navigate(item.url);
    },
    [hasFeature, trackSectionVisit, isEducaPass, isCartaoDigital, navigate, onClose]
  );

  const renderMenuItem = (item: MenuItem, sectionBgColor?: string, sectionTextColor?: string, sectionBorderColor?: string) => {
    const isActive = location.pathname === item.url || (item.url === "/dashboard" && location.pathname === "/");
    const isLockedByPlan = item.requiredFeature && !hasFeature(item.requiredFeature);
    const isLockedByEducaPass = isEducaPass && item.url !== "/educa-academy";
    const isLockedByCartaoDigital = isCartaoDigital && !cartaoDigitalAllowedUrls.includes(item.url);
    const isLocked = isLockedByPlan || isLockedByEducaPass || isLockedByCartaoDigital;

    return (
      <button
        key={item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left",
          isActive && !isLocked && sectionBgColor
            ? cn(sectionBgColor, sectionTextColor, "border-l-[3px]", sectionBorderColor, "font-semibold")
            : isActive && !isLocked
              ? "bg-muted text-foreground font-semibold shadow-sm"
              : isLocked
                ? "opacity-60"
                : sectionBgColor
                  ? cn(sectionBgColor, sectionTextColor, "hover:scale-[1.02] hover:font-semibold")
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
        )}
      >
        <div className="relative flex-shrink-0">
          <item.icon className={cn("h-5 w-5 transition-colors", isActive && !isLocked && !sectionBgColor ? "text-foreground" : "", isLocked ? "text-muted-foreground" : "")} />
          {isLocked && <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />}
        </div>
        <span className={cn("truncate flex-1", isLocked && "text-muted-foreground")}>
          {item.title}
        </span>
      </button>
    );
  };

  const renderSection = (section: MenuSection) => {
    const isActive = isSectionActive(section);
    const hasExplicitState = section.title in openSections;
    const isOpen = hasExplicitState ? !!openSections[section.title] : (!userInteracted && isActive);
    const Icon = section.icon;

    return (
      <div key={section.title} className="px-3">
        <button
          onClick={() => toggleSection(section.title)}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            isOpen ? cn(section.headerBg, section.headerHoverBg) : cn("text-sidebar-foreground", section.hoverColor)
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider flex-1 text-left">{section.title}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen ? "rotate-180 text-white/70" : "text-muted-foreground/50")} />
        </button>
        {isOpen && (
          <nav className="flex flex-col gap-0.5 mt-0.5 animate-fade-in">
            {section.items.filter((item) => !item.adminOnly || isAdmin || (item.key && hasFeatureAccess(item.key))).map((item) => renderMenuItem(item, section.bgColor, section.textColor, section.borderColor))}
          </nav>
        )}
      </div>
    );
  };

  const handleSignOut = () => {
    onClose();
    signOut();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-[70] h-screen w-[300px] max-w-[85vw] bg-sidebar border-l border-sidebar-border flex flex-col lg:hidden",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
          <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-lg font-semibold text-sidebar-foreground">
              Agentes de Sonhos
            </h1>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1">
          <nav className="flex flex-col gap-0.5 px-3">
            {renderMenuItem(isStartPlan ? startDashboardItem : dashboardItem)}
          </nav>

          <div className="py-2 px-3">
            <Separator className="bg-sidebar-border" />
          </div>

          {orderedEntries.map((entry) => {
            if (entry.type === "section") {
              return <React.Fragment key={entry.section.key || entry.section.title}>{renderSection(entry.section)}</React.Fragment>;
            }
            return (
              <nav key={entry.item.key || entry.item.url} className="flex flex-col gap-0.5 px-3">
                {renderMenuItem(entry.item)}
              </nav>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-3 pb-1">
            Conta
          </p>
          {isAdmin && renderMenuItem(adminMenuItem)}
          {renderMenuItem(suporteMenuItem)}
          {renderMenuItem(profileMenuItem)}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Sair</span>
          </Button>
          <div className="text-center pt-2 space-y-0.5">
            <Link to="/atualizacoes" onClick={onClose} className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">
              v1.0 Beta
            </Link>
            <p className="text-[10px] text-muted-foreground/60">Desenvolvido por</p>
            <p className="text-[11px] font-medium text-muted-foreground/80">Nobre Digital</p>
          </div>
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
    </>
  );
}
