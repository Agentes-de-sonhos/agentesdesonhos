import { useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Map,
  Newspaper,
  User,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Cloud,
  LogOut,
  Shield,
  FileText,
  Megaphone,
  Plane,
  Calendar,
  Users,
  Wallet,
  GraduationCap,
  Lock,
  Calculator,
  Heart,
  Kanban,
  Target,
  StickyNote,
  Wrench,
  Briefcase,
  Crown,
  MessageCircleQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
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
  subItems?: MenuItem[];
}

// Main menu items - flat
const mainMenuItems: MenuItem[] = [
  { title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
  { title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
  { title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane },
  { title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone, requiredFeature: "materials" },
  { title: "Notícias", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
];

// Sub-items for Gestão de Clientes
const clientSubItems: MenuItem[] = [
  { title: "Cadastrar Cliente", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic" },
  { title: "Oportunidades", url: "/gestao-clientes/funil", icon: Kanban, requiredFeature: "crm_basic" },
  { title: "Meta de Vendas", url: "/gestao-clientes/metas", icon: Target, requiredFeature: "crm_basic" },
];

// Recursos Premium - collapsible
const premiumMenuItems: MenuItem[] = [
  { title: "Minha Agenda", url: "/agenda", icon: Calendar, requiredFeature: "agenda" },
  { title: "Bloco de Notas", url: "/bloco-notas", icon: StickyNote },
  { title: "Gestão de Clientes", url: "/gestao-clientes/clientes", icon: Briefcase, requiredFeature: "crm_basic", subItems: clientSubItems },
  { title: "Gerar Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator" },
  { title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet, requiredFeature: "trip_wallet" },
  { title: "Ferramentas IA", url: "/ferramentas-ia", icon: Sparkles, requiredFeature: "ai_tools" },
  { title: "Comunidade", url: "/comunidade", icon: Heart, requiredFeature: "community" },
  { title: "Mentorias", url: "/mentorias", icon: GraduationCap },
  { title: "Perguntas e Respostas", url: "/perguntas-respostas", icon: MessageCircleQuestion, requiredFeature: "qa_forum" },
];

const profileMenuItem: MenuItem = { title: "Perfil", url: "/perfil", icon: User };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

type SidebarColor = 'default' | 'tools' | 'clients' | 'premium';

const sidebarColorVar: Record<SidebarColor, string> = {
  default: '--sidebar-hover',
  tools: '--sidebar-hover-tools',
  clients: '--sidebar-hover-clients',
  premium: '--sidebar-hover-premium',
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  collapsed: boolean;
  isPremium?: boolean;
  colorScheme: SidebarColor;
  renderMenuItem: (item: MenuItem, isPremium: boolean, colorScheme: SidebarColor) => React.ReactNode;
  renderPopoverMenuItem: (item: MenuItem, isPremium: boolean, colorScheme: SidebarColor) => React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isActiveSection: boolean;
}

function CollapsibleSection({ title, icon: Icon, items, collapsed, isPremium = false, colorScheme, renderMenuItem, renderPopoverMenuItem, isOpen, onToggle, isActiveSection }: CollapsibleSectionProps) {
  const cssVar = sidebarColorVar[colorScheme];
  const hoverBg = `hsl(var(${cssVar}))`;

  if (collapsed) {
    // Show single section icon with popover for sub-items
    return (
      <nav className="flex flex-col gap-0.5 px-3">
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "group flex items-center justify-center rounded-xl px-3 py-2.5 transition-all duration-300 w-full",
                    isActiveSection ? "text-white shadow-md" : "text-sidebar-foreground hover:text-white"
                  )}
                  style={isActiveSection ? { backgroundColor: hoverBg } : undefined}
                  onMouseEnter={(e) => { if (!isActiveSection) e.currentTarget.style.backgroundColor = hoverBg; }}
                  onMouseLeave={(e) => { if (!isActiveSection) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0 transition-all duration-300", !isActiveSection && "group-hover:scale-110 group-hover:text-white")} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" style={{ backgroundColor: hoverBg }} className="text-white border-none shadow-lg px-3 py-2">
              <p className="text-sm font-medium">{title}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-56 p-2" sideOffset={8}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5">{title}</p>
            <nav className="flex flex-col gap-0.5">
              {items.map((item) => renderPopoverMenuItem(item, isPremium, colorScheme))}
            </nav>
          </PopoverContent>
        </Popover>
      </nav>
    );
  }

  return (
    <div className="px-3">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground transition-all duration-200",
          `hover:bg-[hsl(var(${cssVar}))]/30`
        )}
      >
        <div className="h-4 w-4" style={{ color: `hsl(var(${cssVar}))` }}><Icon className="h-4 w-4" /></div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex-1 text-left">
          {title}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <nav className="flex flex-col gap-0.5 mt-0.5 animate-fade-in">
          {items.map((item) => renderMenuItem(item, isPremium, colorScheme))}
        </nav>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();
  const { trackSectionVisit } = useGamification();

  const isInPremium = premiumMenuItems.some((i) => 
    i.subItems 
      ? i.subItems.some(sub => location.pathname.startsWith(sub.url))
      : (location.pathname === i.url || location.pathname.startsWith(i.url))
  );

  const handleMenuClick = useCallback((item: MenuItem, e: React.MouseEvent) => {
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      e.preventDefault();
      setUpgradeFeature(item.requiredFeature);
      return;
    }
    // Track section visit for gamification
    trackSectionVisit(item.url);
    // Auto-collapse after navigation
    setCollapsed(true);
  }, [hasFeature, trackSectionVisit]);

  const renderMenuItem = (item: MenuItem, isPremiumSection: boolean = false, colorScheme: SidebarColor = 'default') => {
    const isActive = item.subItems 
      ? item.subItems.some(sub => location.pathname.startsWith(sub.url))
      : (location.pathname === item.url || (item.url === "/dashboard" && location.pathname === "/"));
    const isLocked = item.requiredFeature && !hasFeature(item.requiredFeature);
    const showPremiumLock = isPremiumSection && isLocked;
    const cssVar = sidebarColorVar[colorScheme];
    const hoverBg = `hsl(var(${cssVar}))`;

    // If item has subItems, render with hover popover
    if (item.subItems && !isLocked) {
      const trigger = (
        <button
          key={item.url}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 w-full",
            !isActive && "text-sidebar-foreground hover:text-white"
          )}
          style={isActive ? { backgroundColor: hoverBg, color: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } : undefined}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = hoverBg; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-all duration-300", !isActive && "group-hover:scale-110 group-hover:text-white", isActive && "text-white")} />
          {!collapsed && (
            <>
              <span className={cn("animate-fade-in truncate transition-colors duration-300", !isActive && "group-hover:text-white", isActive && "text-white")}>
                {item.title}
              </span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50 flex-shrink-0" />
            </>
          )}
        </button>
      );

      return (
        <Popover key={item.url}>
          <PopoverTrigger asChild>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                <TooltipContent side="right" style={{ backgroundColor: hoverBg }} className="text-white border-none shadow-lg px-3 py-2">
                  <p className="text-sm font-medium">{item.title}</p>
                </TooltipContent>
              </Tooltip>
            ) : trigger}
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-52 p-2" sideOffset={8}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5">{item.title}</p>
            <nav className="flex flex-col gap-0.5">
              {item.subItems.map((sub) => {
                const subActive = location.pathname.startsWith(sub.url);
                return (
                  <Link
                    key={sub.url}
                    to={sub.url}
                    onClick={(e) => { handleMenuClick(sub, e); }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200",
                      subActive ? "text-white" : "text-foreground hover:text-white"
                    )}
                    style={subActive ? { backgroundColor: hoverBg, color: 'white' } : undefined}
                    onMouseEnter={(e) => { if (!subActive) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = 'white'; } }}
                    onMouseLeave={(e) => { if (!subActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = ''; } }}
                  >
                    <sub.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{sub.title}</span>
                  </Link>
                );
              })}
            </nav>
          </PopoverContent>
        </Popover>
      );
    }

    const menuLink = (
      <Link
        key={item.url}
        to={isLocked ? "#" : item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
          isLocked && "opacity-60 cursor-pointer hover:opacity-70",
          !isActive && !isLocked && "text-sidebar-foreground hover:text-white"
        )}
        style={isActive && !isLocked ? { backgroundColor: hoverBg, color: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } : undefined}
        onMouseEnter={(e) => { if (!isActive && !isLocked) e.currentTarget.style.backgroundColor = hoverBg; }}
        onMouseLeave={(e) => { if (!isActive && !isLocked) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div className="relative transition-colors duration-300">
          <item.icon
            className={cn(
              "h-5 w-5 flex-shrink-0 transition-all duration-300",
              !isActive && !isLocked && "group-hover:scale-110 group-hover:text-white",
              isLocked && "text-muted-foreground",
              isActive && !isLocked && "text-white"
            )}
          />
          {showPremiumLock && (
            <Lock className="h-3 w-3 absolute -top-1.5 -right-1.5 text-warning" />
          )}
        </div>
        {!collapsed && (
          <span className={cn(
            "animate-fade-in truncate transition-colors duration-300",
            isLocked && "text-muted-foreground",
            !isActive && !isLocked && "group-hover:text-white",
            isActive && !isLocked && "text-white"
          )}>
            {item.title}
          </span>
        )}
        {!collapsed && showPremiumLock && (
          <Lock className="h-3.5 w-3.5 ml-auto text-warning flex-shrink-0" />
        )}
      </Link>
    );

    if (showPremiumLock && !collapsed) {
      return (
        <Tooltip key={item.url}>
          <TooltipTrigger asChild>
            {menuLink}
          </TooltipTrigger>
          <TooltipContent side="right" style={{ backgroundColor: hoverBg }} className="text-white border-none shadow-lg">
            <p className="text-sm">Disponível nos planos Pro ou Premium</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (collapsed) {
      return (
        <Tooltip key={item.url}>
          <TooltipTrigger asChild>
            {menuLink}
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            style={{ backgroundColor: hoverBg }}
            className="text-white border-none shadow-lg px-3 py-2"
          >
            <p className="text-sm font-medium">{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuLink;
  };

  // Render menu items for popover (when collapsed, inside section popover)
  const renderPopoverMenuItem = (item: MenuItem, isPremiumSection: boolean = false, colorScheme: SidebarColor = 'default') => {
    const isActive = item.subItems
      ? item.subItems.some(sub => location.pathname.startsWith(sub.url))
      : location.pathname === item.url;
    const isLocked = item.requiredFeature && !hasFeature(item.requiredFeature);
    const cssVar = sidebarColorVar[colorScheme];
    const hoverBg = `hsl(var(${cssVar}))`;

    // If has subItems, render them inline as a group
    if (item.subItems && !isLocked) {
      return (
        <div key={item.url}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 px-2 pt-2 pb-1">{item.title}</p>
          {item.subItems.map((sub) => {
            const subActive = location.pathname.startsWith(sub.url);
            return (
              <Link
                key={sub.url}
                to={sub.url}
                onClick={(e) => handleMenuClick(sub, e)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200",
                  subActive ? "text-white" : "text-foreground hover:text-white"
                )}
                style={subActive ? { backgroundColor: hoverBg, color: 'white' } : undefined}
                onMouseEnter={(e) => { if (!subActive) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = 'white'; } }}
                onMouseLeave={(e) => { if (!subActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = ''; } }}
              >
                <sub.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{sub.title}</span>
              </Link>
            );
          })}
        </div>
      );
    }

    return (
      <Link
        key={item.url}
        to={isLocked ? "#" : item.url}
        onClick={(e) => {
          handleMenuClick(item, e);
        }}
        className={cn(
          "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200",
          isActive ? "text-white" : "text-foreground hover:text-white",
          isLocked && "opacity-60"
        )}
        style={isActive ? { backgroundColor: hoverBg, color: 'white' } : undefined}
        onMouseEnter={(e) => { if (!isActive && !isLocked) e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={(e) => { if (!isActive && !isLocked) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = ''; } }}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{item.title}</span>
        {isPremiumSection && isLocked && <Lock className="h-3 w-3 ml-auto text-warning" />}
      </Link>
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
                  Página Inicial
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
          {/* Admin menu item if admin */}
          {isAdmin && (
            <nav className="flex flex-col gap-0.5 px-3 mb-3">
              {renderMenuItem(adminMenuItem, false)}
            </nav>
          )}

          {/* Main Navigation - flat */}
          <nav className="flex flex-col gap-0.5 px-3">
            {mainMenuItems.map((item) => renderMenuItem(item, false))}
          </nav>

          {/* Separator */}
          <div className="px-3 py-2">
            <Separator className="bg-sidebar-border" />
          </div>

          {/* Recursos Premium - collapsible */}
          <CollapsibleSection
            title="Recursos Premium"
            icon={Crown}
            items={premiumMenuItems}
            collapsed={collapsed}
            isPremium={true}
            colorScheme="premium"
            renderMenuItem={renderMenuItem}
            renderPopoverMenuItem={renderPopoverMenuItem}
            isOpen={premiumOpen || isInPremium}
            onToggle={() => setPremiumOpen(!premiumOpen)}
            isActiveSection={isInPremium}
          />
        </div>

        {/* Bottom Section */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3 space-y-2">
          {/* Profile Button */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-9 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/perfil")}
                >
                  <User className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[hsl(var(--sidebar-hover))] text-white border-none shadow-lg px-3 py-2">
                <p className="text-sm font-medium">Meu Perfil</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground text-sm"
              onClick={() => navigate("/perfil")}
            >
              <User className="h-4 w-4" />
              Meu Perfil
            </Button>
          )}
          {/* Logout Button */}
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
              <TooltipContent side="right" className="bg-[hsl(var(--sidebar-hover))] text-white border-none shadow-lg px-3 py-2">
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
          {/* Footer */}
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
