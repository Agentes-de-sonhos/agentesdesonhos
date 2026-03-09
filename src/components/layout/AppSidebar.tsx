import { useState, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
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
  Heart,
  MessageCircleQuestion,
  Store,
  CreditCard,
  Wallet,
  Home,
  BookOpen,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { useMenuOrder } from "@/hooks/useMenuOrder";
import { Feature } from "@/types/subscription";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
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
}

// ── Static sections ──

const aprenderSection: MenuSection = {
  title: "Aprender",
  icon: BookOpen,
  items: [
    { title: "Notícias do Trade", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
    { title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { title: "Perguntas e Respostas", url: "/perguntas-respostas", icon: MessageCircleQuestion, requiredFeature: "qa_forum" },
  ],
};

const clientesSection: MenuSection = {
  title: "Clientes",
  icon: Users,
  items: [
    { title: "Gestão de Clientes", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic" },
  ],
};

const comunidadeSection: MenuSection = {
  title: "Comunidade",
  icon: Heart,
  items: [
    { title: "Comunidade de Agentes", url: "/comunidade", icon: Heart, requiredFeature: "community" },
  ],
};

// Vender items with keys for dynamic ordering
const venderItemsMap: Record<string, MenuItem> = {
  "materiais": { key: "materiais", title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone, requiredFeature: "materials" },
  "gerar-orcamento": { key: "gerar-orcamento", title: "Gerar Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator", isHighlighted: true },
  "criar-carteira": { key: "criar-carteira", title: "Criar Carteira", url: "/carteira-digital", icon: Wallet },
  "ferramentas-ia": { key: "ferramentas-ia", title: "Ferramentas IA", url: "/ferramentas-ia", icon: Sparkles, requiredFeature: "ai_tools", isPremium: true },
  "mentorias": { key: "mentorias", title: "Mentorias", url: "/mentorias", icon: GraduationCap, isPremium: true },
  "cartao-digital": { key: "cartao-digital", title: "Meu Cartão", url: "/meu-cartao", icon: CreditCard, isPremium: true },
  "bloqueios-aereos": { key: "bloqueios-aereos", title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane },
  "mapa-turismo": { key: "mapa-turismo", title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
  "minha-vitrine": { key: "minha-vitrine", title: "Minha Vitrine", url: "/minha-vitrine", icon: Store, isPremium: true },
};

const defaultVenderOrder = ["materiais", "gerar-orcamento", "criar-carteira", "ferramentas-ia", "mentorias", "cartao-digital", "bloqueios-aereos", "mapa-turismo", "minha-vitrine"];

const dashboardItem: MenuItem = { title: "Início", url: "/dashboard", icon: Home };
const profileMenuItem: MenuItem = { title: "Perfil", url: "/perfil", icon: User };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature } = useSubscription();
  const { trackSectionVisit } = useGamification();
  const { menuOrder } = useMenuOrder("vender");

  // Build vender section with dynamic order
  const venderSection: MenuSection = useMemo(() => {
    let orderedKeys = defaultVenderOrder;
    if (menuOrder && menuOrder.length > 0) {
      orderedKeys = [...menuOrder].sort((a, b) => a.order_index - b.order_index).map((m) => m.item_key);
    }
    const items = orderedKeys.map((key) => venderItemsMap[key]).filter(Boolean);
    return { title: "Vender", icon: ShoppingBag, items };
  }, [menuOrder]);

  const allSections: MenuSection[] = useMemo(
    () => [aprenderSection, venderSection, clientesSection, comunidadeSection],
    [venderSection]
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isSectionActive = (section: MenuSection) =>
    section.items.some((i) => location.pathname === i.url || location.pathname.startsWith(i.url));

  const handleMenuClick = useCallback(
    (item: MenuItem, e: React.MouseEvent) => {
      if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
        e.preventDefault();
        setUpgradeFeature(item.requiredFeature);
        return;
      }
      trackSectionVisit(item.url);
      setCollapsed(true);
    },
    [hasFeature, trackSectionVisit]
  );

  const renderSingleItem = (item: MenuItem) => {
    const isActive =
      location.pathname === item.url ||
      (item.url === "/dashboard" && location.pathname === "/");
    const isLocked = item.requiredFeature && !hasFeature(item.requiredFeature);

    const menuLink = (
      <Link
        key={item.url}
        to={isLocked ? "#" : item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
          isActive && !isLocked
            ? "bg-primary text-primary-foreground shadow-md"
            : isLocked
              ? "opacity-60 cursor-pointer hover:opacity-70 text-sidebar-foreground"
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
              isLocked && "text-muted-foreground"
            )}
          />
          {item.isPremium && isLocked && (
            <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className={cn("truncate flex-1", isLocked && "text-muted-foreground")}>
              {item.title}
            </span>
            {item.isPremium && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-warning/50 text-warning font-semibold flex-shrink-0">
                PRO
              </Badge>
            )}
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
            {item.isPremium && <p className="text-xs text-warning">Premium</p>}
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
                        itemActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
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
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex-1 text-left">
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
    </TooltipProvider>
  );
}
