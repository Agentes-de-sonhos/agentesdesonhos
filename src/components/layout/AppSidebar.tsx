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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
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
}

// ── Static sections ──

const conhecimentoSection: MenuSection = {
  title: "Conhecimento",
  icon: BookOpen,
  hoverColor: "hover:bg-blue-50 hover:text-blue-700",
  items: [
    { title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { title: "Notícias do Trade", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
    { title: "Pergunte e Responda", url: "/perguntas-respostas", icon: MessageCircleQuestion, requiredFeature: "qa_forum" },
  ],
};

const guiasSection: MenuSection = {
  title: "Guias e Referências",
  icon: BookMarked,
  hoverColor: "hover:bg-emerald-50 hover:text-emerald-700",
  items: [
    { title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
    { title: "Travel Advisor", url: "/dream-advisor", icon: Compass },
    { title: "Benefícios e Descontos", url: "/comunidade", icon: Tag, requiredFeature: "community" },
    { title: "Minha Agenda", url: "/agenda", icon: CalendarDays },
  ],
};

const recursosVendasSection: MenuSection = {
  title: "Recursos de Vendas",
  icon: ShoppingCart,
  hoverColor: "hover:bg-orange-50 hover:text-orange-700",
  items: [
    { title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane },
    { title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone, requiredFeature: "materials" },
  ],
};

const criarSection: MenuSection = {
  title: "Criar",
  icon: PlusCircle,
  hoverColor: "hover:bg-violet-50 hover:text-violet-700",
  items: [
    { title: "Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator", isHighlighted: true },
    { title: "Roteiros", url: "/ferramentas-ia/criar-roteiro", icon: Route, requiredFeature: "ai_tools" },
    { title: "Conteúdo", url: "/ferramentas-ia/criar-conteudo", icon: FileText, requiredFeature: "ai_tools" },
  ],
};

const clientesSection: MenuSection = {
  title: "Clientes",
  icon: Users,
  hoverColor: "hover:bg-cyan-50 hover:text-cyan-700",
  items: [
    { title: "Gestão de Clientes", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic" },
    { title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet },
  ],
};

const marketingSection: MenuSection = {
  title: "Marketing",
  icon: Megaphone,
  hoverColor: "hover:bg-pink-50 hover:text-pink-700",
  items: [
    { title: "Cartão de Visitas", url: "/meu-cartao", icon: CreditCard },
    { title: "Vitrine Virtual", url: "/minha-vitrine", icon: Store },
  ],
};

const comunidadeItem: MenuItem = { title: "Comunidade", url: "/comunidade", icon: Heart };
const mentoriasItem: MenuItem = { title: "Mentorias", url: "/mentorias", icon: GraduationCap };

const dashboardItem: MenuItem = { title: "Início", url: "/dashboard", icon: Home };
const profileMenuItem: MenuItem = { title: "Perfil", url: "/perfil", icon: User };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();
  const { trackSectionVisit } = useGamification();

  const isEducaPass = plan === "educa_pass";

  const allSections: MenuSection[] = useMemo(
    () => [conhecimentoSection, guiasSection, recursosVendasSection, criarSection, clientesSection, marketingSection],
    []
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[title];
      // Close all, then toggle the clicked one
      const allClosed: Record<string, boolean> = {};
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
      if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
        e.preventDefault();
        setUpgradeFeature(item.requiredFeature);
        return;
      }
      trackSectionVisit(item.url);
      setCollapsed(true);
    },
    [hasFeature, trackSectionVisit, isEducaPass]
  );

  const renderSingleItem = (item: MenuItem, sectionHoverColor?: string) => {
    const isActive =
      location.pathname === item.url ||
      (item.url === "/dashboard" && location.pathname === "/");
    const isLockedByPlan = item.requiredFeature && !hasFeature(item.requiredFeature);
    const isLockedByEducaPass = isEducaPass && item.url !== "/educa-academy";
    const isLocked = isLockedByPlan || isLockedByEducaPass;

    const menuLink = (
      <Link
        key={item.url}
        to={isLocked ? "#" : item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
          isActive && !isLocked
            ? "bg-primary text-primary-foreground shadow-md"
            : (isLocked && !isLockedByEducaPass)
              ? "opacity-60 cursor-pointer hover:opacity-70 text-sidebar-foreground"
              : isLockedByEducaPass
                ? "cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                : sectionHoverColor
                  ? cn("text-sidebar-foreground", sectionHoverColor)
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
          item.isHighlighted && !isActive && !isLocked && "ring-1 ring-primary/40 bg-primary/5"
        )}
      >
        <div className="relative flex-shrink-0">
          <item.icon
            className={cn(
              "h-5 w-5 transition-all duration-300",
              isActive && !isLocked && "text-primary-foreground",
              !isActive && !isLocked && "group-hover:scale-110",
              isLocked && !isLockedByEducaPass && "text-muted-foreground"
            )}
          />
          {isLocked && !isLockedByEducaPass && (
            <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className={cn("truncate flex-1", isLocked && !isLockedByEducaPass && "text-muted-foreground")}>
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
    const isOpen = openSections[section.title] ?? isActive;
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
                      "group flex items-center justify-center rounded-xl px-3 py-2.5 transition-all duration-300 w-full",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5">
                {section.title}
              </p>
              <nav className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const itemActive = location.pathname === item.url || location.pathname.startsWith(item.url);
                  const isLocked = item.requiredFeature && !hasFeature(item.requiredFeature);
                  return (
                    <Link
                      key={item.url}
                      to={isLocked ? "#" : item.url}
                      onClick={(e) => handleMenuClick(item, e)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200",
                        itemActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted hover:text-foreground",
                        isLocked && "opacity-60"
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate flex-1">{item.title}</span>
                      {item.isPremium && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-warning/50 text-warning font-semibold">
                          PRO
                        </Badge>
                      )}
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
            "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground transition-all duration-200",
            section.hoverColor
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider flex-1 text-left">
            {section.title}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <nav className="flex flex-col gap-0.5 mt-0.5 animate-fade-in">
            {section.items.map((item) => renderSingleItem(item))}
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
        <div className="flex-1 overflow-y-auto py-4 space-y-1">
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
            {renderSingleItem(comunidadeItem)}
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
            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground/60">Desenvolvido por</p>
              <p className="text-[11px] font-medium text-muted-foreground/80">Nobre Digital</p>
            </div>
          ) : (
            <div className="text-center pt-2">
              <p className="text-[8px] text-muted-foreground/60">NDH</p>
            </div>
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
