import { useState, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Map,
  Newspaper,
  User,
  ChevronLeft,
  ChevronDown,
  Cloud,
  LogOut,
  Shield,
  Megaphone,
  Plane,
  Users,
  GraduationCap,
  Lock,
  Calculator,
  MessageCircleQuestion,
  Store,
  CreditCard,
  Wallet,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useGamificationLite } from "@/hooks/useGamificationLite";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { Feature } from "@/types/subscription";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { ComingSoonDialog } from "@/components/subscription/ComingSoonDialog";
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
  isPremium?: boolean;
  isHighlighted?: boolean;
  key?: string;
}

interface MenuSection {
  title: string;
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
  icon: BookOpen,
  hoverColor: "hover:bg-blue-600 hover:text-white",
  headerBg: "bg-blue-600 text-white",
  headerHoverBg: "hover:bg-blue-700",
  bgColor: "bg-blue-50",
  textColor: "text-blue-700",
  borderColor: "border-blue-600",
  items: [
    { title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { title: "Notícias do Trade", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
  ],
};

const comunidadeSection: MenuSection = {
  title: "Comunidade",
  icon: Heart,
  hoverColor: "hover:bg-red-600 hover:text-white",
  headerBg: "bg-red-600 text-white",
  headerHoverBg: "hover:bg-red-700",
  bgColor: "bg-red-50",
  textColor: "text-red-700",
  borderColor: "border-red-600",
  items: [
    { title: "Perguntas e Respostas", url: "/perguntas-respostas", icon: MessageCircleQuestion, requiredFeature: "qa_forum" },
    { title: "Travel Experts", url: "/comunidade", icon: Users, requiredFeature: "community" },
  ],
};

const guiasSection: MenuSection = {
  title: "Guias e Referências",
  icon: BookMarked,
  hoverColor: "hover:bg-emerald-600 hover:text-white",
  headerBg: "bg-emerald-600 text-white",
  headerHoverBg: "hover:bg-emerald-700",
  bgColor: "bg-emerald-50",
  textColor: "text-emerald-700",
  borderColor: "border-emerald-600",
  items: [
    { title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
    { title: "Travel Advisor", url: "/dream-advisor", icon: Compass },
    { title: "Benefícios e Descontos", url: "/beneficios", icon: Tag, requiredFeature: "community" },
    { title: "Minha Agenda", url: "/agenda", icon: CalendarDays },
  ],
};

const recursosVendasSection: MenuSection = {
  title: "Recursos de Vendas",
  icon: ShoppingCart,
  hoverColor: "hover:bg-orange-600 hover:text-white",
  headerBg: "bg-orange-600 text-white",
  headerHoverBg: "hover:bg-orange-700",
  bgColor: "bg-orange-50",
  textColor: "text-orange-700",
  borderColor: "border-orange-600",
  items: [
    { title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane },
    { title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone, requiredFeature: "materials" },
  ],
};

const criarSection: MenuSection = {
  title: "Criar",
  icon: PlusCircle,
  hoverColor: "hover:bg-violet-600 hover:text-white",
  headerBg: "bg-violet-600 text-white",
  headerHoverBg: "hover:bg-violet-700",
  bgColor: "bg-violet-50",
  textColor: "text-violet-700",
  borderColor: "border-violet-600",
  items: [
    { title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet, requiredFeature: "trip_wallet" },
    { title: "Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator" },
    { title: "Roteiros", url: "/ferramentas-ia/criar-roteiro", icon: Route, requiredFeature: "itinerary" },
    { title: "Conteúdo", url: "/ferramentas-ia/criar-conteudo", icon: FileText, requiredFeature: "content_creator" },
  ],
};

const clientesSection: MenuSection = {
  title: "Clientes",
  icon: Users,
  hoverColor: "hover:bg-cyan-600 hover:text-white",
  headerBg: "bg-cyan-600 text-white",
  headerHoverBg: "hover:bg-cyan-700",
  bgColor: "bg-cyan-50",
  textColor: "text-cyan-700",
  borderColor: "border-cyan-600",
  items: [
    { title: "Gestão de Clientes", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic" },
    { title: "Oportunidades", url: "/gestao-clientes/funil", icon: ShoppingCart, requiredFeature: "crm_basic" },
    { title: "Meta de Vendas", url: "/gestao-clientes/metas", icon: Calculator, requiredFeature: "financial" },
  ],
};

const marketingSection: MenuSection = {
  title: "Marketing",
  icon: Megaphone,
  hoverColor: "hover:bg-pink-600 hover:text-white",
  headerBg: "bg-pink-600 text-white",
  headerHoverBg: "hover:bg-pink-700",
  bgColor: "bg-pink-50",
  textColor: "text-pink-700",
  borderColor: "border-pink-600",
  items: [
    { title: "Cartão de Visitas", url: "/meu-cartao", icon: CreditCard },
    { title: "Vitrine de Ofertas", url: "/minha-vitrine", icon: Store },
    { title: "Personalizador de Lâminas", url: "/personalizador-laminas", icon: Paintbrush },
    { title: "Captação de Leads", url: "/meus-leads", icon: UserPlus },
  ],
};

const mentoriasItem: MenuItem = { title: "Cursos e Mentorias", url: "/cursos", icon: GraduationCap };

const dashboardItem: MenuItem = { title: "Início", url: "/dashboard", icon: Home };
const profileMenuItem: MenuItem = { title: "Perfil", url: "/perfil", icon: User };
const suporteMenuItem: MenuItem = { title: "Suporte", url: "/suporte", icon: Headset };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean | undefined>>({});
  const [userInteracted, setUserInteracted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan, isPromotor } = useSubscription();
  const { trackSectionVisit } = useGamificationLite();

  const isEducaPass = !isPromotor && plan === "educa_pass";
  const isCartaoDigital = !isPromotor && plan === "cartao_digital";
  const isRestrictedPlan = isEducaPass || isCartaoDigital;

  const allSections: MenuSection[] = useMemo(
    () => [conhecimentoSection, guiasSection, recursosVendasSection, criarSection, clientesSection, marketingSection, comunidadeSection],
    []
  );

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
      if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
        e.preventDefault();
        setUpgradeFeature(item.requiredFeature);
        return;
      }
      trackSectionVisit(item.url);
      setCollapsed(true);
    },
    [hasFeature, trackSectionVisit, isEducaPass, isCartaoDigital]
  );

  const cartaoDigitalAllowedUrls = ["/meu-cartao", "/perfil", "/dashboard", "/mentorias"];

  const renderSingleItem = (item: MenuItem, sectionBgColor?: string, sectionTextColor?: string, sectionBorderColor?: string, forceShowLock?: boolean) => {
    const isActive =
      location.pathname === item.url ||
      (item.url === "/dashboard" && location.pathname === "/");
    const isLockedByPlan = item.requiredFeature && !hasFeature(item.requiredFeature);
    const isLockedByEducaPass = isEducaPass && item.url !== "/educa-academy";
    const isLockedByCartaoDigital = isCartaoDigital && !cartaoDigitalAllowedUrls.includes(item.url);
    const isLocked = isLockedByPlan || isLockedByEducaPass || isLockedByCartaoDigital;
    const showLockIcon = isLocked || forceShowLock;

    const menuLink = (
      <Link
        key={item.url}
        to={isLocked ? "#" : item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-300",
          isActive && !isLocked && sectionBgColor
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
              "h-5 w-5 transition-all duration-300",
              isActive && !isLocked && !sectionBgColor && "text-foreground",
              isLocked && "text-muted-foreground"
            )}
          />
          {showLockIcon && (
            <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className={cn("truncate flex-1", isLocked && "text-muted-foreground")}>
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

  const renderSection = (section: MenuSection) => {
    const isActive = isSectionActive(section);
    const hasExplicitState = section.title in openSections;
    const isOpen = hasExplicitState ? !!openSections[section.title] : (!userInteracted && isActive);
    const Icon = section.icon;

    if (collapsed) {
      return (
        <nav key={section.title} className="flex flex-col gap-0.5 px-3">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "group flex items-center justify-center rounded-xl px-3 py-1.5 transition-all duration-300 w-full",
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
            <PopoverContent side="right" align="start" className="w-56 p-2" sideOffset={8}>
              <p className={cn(
                "text-[11px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg",
                section.headerBg
              )}>
                {section.title}
              </p>
              <nav className="flex flex-col gap-0.5 mt-1">
                {section.items.map((item) => {
                  const itemActive = location.pathname === item.url || location.pathname.startsWith(item.url);
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
          <span className="text-[11px] font-bold uppercase tracking-wider flex-1 text-left">
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
            {section.items.map((item) => renderSingleItem(item, section.bgColor, section.textColor, section.borderColor))}
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
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 flex-col hidden lg:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="font-display text-lg font-semibold text-sidebar-foreground">
                  Agentes de Sonhos
                </h1>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {/* Início */}
          <nav className="flex flex-col gap-0.5 px-3">
            {renderSingleItem(dashboardItem)}
          </nav>

          <div className="px-3 py-2">
            <Separator className="bg-sidebar-border" />
          </div>

          {/* All sections */}
          {allSections.map((section) => renderSection(section))}

          {/* Standalone items */}
          <nav className={cn("flex flex-col", collapsed ? "items-center gap-1 px-2" : "gap-0.5 px-3")}>
            {renderSingleItem(mentoriasItem)}
          </nav>
        </div>

        {/* Bottom Section - Conta */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3 space-y-1">
          {!collapsed && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-3 pb-1">
              Conta
            </p>
          )}

          {isAdmin && renderSingleItem(adminMenuItem)}
          {renderSingleItem(suporteMenuItem)}
          {renderSingleItem(profileMenuItem)}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
                <p className="text-sm font-medium">Sair</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          )}

          {!collapsed ? (
            <div className="text-center pt-2 space-y-0.5">
              <Link to="/atualizacoes" className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">
                v1.0 Beta
              </Link>
              <p className="text-[10px] text-muted-foreground/60">Desenvolvido por</p>
              <p className="text-[11px] font-medium text-muted-foreground/80">Nobre Digital</p>
            </div>
          ) : (
            <Link to="/atualizacoes" className="block text-center pt-2">
              <p className="text-[8px] text-muted-foreground/50 hover:text-primary transition-colors">v1.0</p>
            </Link>
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
