import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Map,
  Newspaper,
  User,
  Cloud,
  LogOut,
  Shield,
  FileText,
  Plane,
  Calendar,
  Users,
  Wallet,
  GraduationCap,
  Lock,
  Calculator,
  Heart,
  Crown,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  StickyNote,
  Kanban,
  Wrench,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
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

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature?: Feature;
}

const mainMenuItems: MenuItem[] = [
  { title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
  { title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
  { title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane },
  { title: "Materiais de Divulgação", url: "/materiais", icon: FileText, requiredFeature: "materials" },
  { title: "Notícias", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
];

const toolsItems: MenuItem[] = [
  { title: "Minha Agenda", url: "/agenda", icon: Calendar, requiredFeature: "agenda" },
  { title: "Bloco de Notas", url: "/bloco-notas", icon: StickyNote },
  { title: "Calculadora", url: "/calculadora", icon: Calculator },
];

const clientManagementItems: MenuItem[] = [
  { title: "Clientes", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic" },
  { title: "Funil de Vendas", url: "/gestao-clientes/funil", icon: Kanban, requiredFeature: "crm_basic" },
];

const premiumMenuItems: MenuItem[] = [
  { title: "Gerar Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator" },
  { title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet, requiredFeature: "trip_wallet" },
  { title: "Ferramentas IA", url: "/ferramentas-ia", icon: Sparkles, requiredFeature: "ai_tools" },
  { title: "Comunidade", url: "/comunidade", icon: Heart, requiredFeature: "community" },
  { title: "Mentorias", url: "/mentorias", icon: GraduationCap },
];

const profileMenuItem: MenuItem = { title: "Perfil", url: "/perfil", icon: User };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function MobileSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();

  const isInTools = toolsItems.some((i) => location.pathname === i.url);
  const isInClients = clientManagementItems.some((i) => location.pathname.startsWith(i.url));
  const isInPremium = premiumMenuItems.some((i) => location.pathname === i.url);

  const handleMenuClick = (item: MenuItem, e: React.MouseEvent) => {
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      e.preventDefault();
      setUpgradeFeature(item.requiredFeature);
      return;
    }
    setExpanded(false);
    navigate(item.url);
  };

  const handleSignOut = () => {
    setExpanded(false);
    signOut();
  };

  const handleOverlayClick = () => {
    setExpanded(false);
  };

  const renderMenuItem = (item: MenuItem, isPremiumSection: boolean = false) => {
    const isActive = location.pathname === item.url;
    const isLocked = item.requiredFeature && !hasFeature(item.requiredFeature);
    const showPremiumLock = isPremiumSection && isLocked;

    const iconElement = (
      <div className="relative flex-shrink-0">
        <item.icon
          className={cn(
            "h-5 w-5 transition-colors",
            isActive && !isLocked ? "text-primary-foreground" : "",
            isLocked ? "text-muted-foreground" : ""
          )}
        />
        {showPremiumLock && (
          <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />
        )}
      </div>
    );

    // Collapsed mode - icon only with tooltip
    if (!expanded) {
      return (
        <Tooltip key={item.url}>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => handleMenuClick(item, e)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
                isActive && !isLocked
                  ? "bg-primary text-primary-foreground shadow-md"
                  : isLocked
                    ? "opacity-50"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              {iconElement}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="text-sm font-medium">{item.title}</p>
            {showPremiumLock && (
              <p className="text-xs text-muted-foreground">Plano Pro ou Premium</p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    // Expanded mode - full item
    return (
      <button
        key={item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left",
          isActive && !isLocked
            ? "bg-primary text-primary-foreground shadow-md"
            : isLocked
              ? "opacity-60"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        {iconElement}
        <span className={cn("truncate", isLocked && "text-muted-foreground")}>
          {item.title}
        </span>
        {showPremiumLock && (
          <Lock className="h-3.5 w-3.5 ml-auto text-warning flex-shrink-0" />
        )}
      </button>
    );
  };

  const renderCollapsibleSection = (
    title: string,
    icon: React.ComponentType<{ className?: string }>,
    items: MenuItem[],
    isOpen: boolean,
    onToggle: () => void,
    isPremium: boolean = false
  ) => {
    const Icon = icon;

    if (!expanded) {
      // Collapsed: just show icons
      return (
        <nav className="flex flex-col items-center gap-1 px-2">
          {items.map((item) => renderMenuItem(item, isPremium))}
        </nav>
      );
    }

    return (
      <div className="px-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex-1 text-left">
            {title}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <nav className="flex flex-col gap-0.5 mt-0.5 animate-fade-in">
            {items.map((item) => renderMenuItem(item, isPremium))}
          </nav>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      {/* Overlay - only when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-sidebar-border bg-sidebar flex flex-col lg:hidden transition-all duration-300 ease-out",
          expanded ? "w-[280px] shadow-2xl" : "w-14"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center border-b border-sidebar-border flex-shrink-0 transition-all duration-300",
          expanded ? "h-16 px-4 justify-between" : "h-14 justify-center"
        )}>
          {expanded ? (
            <>
              <Link to="/dashboard" onClick={() => setExpanded(false)} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                  <Cloud className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="font-display text-lg font-semibold text-sidebar-foreground animate-fade-in">
                  Agentes de Sonhos
                </h1>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground"
                onClick={() => setExpanded(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-sidebar-foreground"
              onClick={() => setExpanded(true)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1">
          {/* Admin menu item if admin */}
          {isAdmin && (
            <nav className={cn(
              "flex flex-col mb-2",
              expanded ? "gap-0.5 px-3" : "items-center gap-1 px-2"
            )}>
              {renderMenuItem(adminMenuItem, false)}
            </nav>
          )}

          {/* Main Navigation - flat */}
          <nav className={cn(
            "flex flex-col",
            expanded ? "gap-0.5 px-3" : "items-center gap-1 px-2"
          )}>
            {mainMenuItems.map((item) => renderMenuItem(item, false))}
          </nav>

          {/* Separator */}
          <div className={cn("py-2", expanded ? "px-3" : "px-2")}>
            <Separator className="bg-sidebar-border" />
          </div>

          {/* Ferramentas - collapsible */}
          {renderCollapsibleSection("Ferramentas", Wrench, toolsItems, toolsOpen || isInTools, () => setToolsOpen(!toolsOpen))}

          {/* Gestão de Clientes - collapsible */}
          {renderCollapsibleSection("Gestão de Clientes", Briefcase, clientManagementItems, clientsOpen || isInClients, () => setClientsOpen(!clientsOpen))}

          {/* Recursos Premium - collapsible */}
          {renderCollapsibleSection("Recursos Premium", Crown, premiumMenuItems, premiumOpen || isInPremium, () => setPremiumOpen(!premiumOpen), true)}
        </div>

        {/* Bottom Section */}
        <div className={cn(
          "flex-shrink-0 border-t border-sidebar-border space-y-2",
          expanded ? "p-3" : "p-2 flex flex-col items-center"
        )}>
          {/* Profile */}
          {renderMenuItem(profileMenuItem, false)}

          {/* Plan Badge - only when expanded */}
          {expanded && (
            <div className={cn(
              "rounded-lg p-2.5 flex items-center gap-2 transition-colors",
              plan === "premium" && "bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30",
              plan === "profissional" && "bg-primary/10 border border-primary/20",
              plan === "essencial" && "bg-muted border border-border"
            )}>
              <Crown className={cn(
                "h-4 w-4 flex-shrink-0",
                plan === "premium" && "text-warning",
                plan === "profissional" && "text-primary",
                plan === "essencial" && "text-muted-foreground"
              )} />
              <span className={cn(
                "text-xs font-medium",
                plan === "premium" && "text-warning",
                plan === "profissional" && "text-primary",
                plan === "essencial" && "text-muted-foreground"
              )}>
                Plano {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>
            </div>
          )}

          {/* Logout Button */}
          {expanded ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>Sair</span>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Footer */}
          {expanded && (
             <div className="text-center pt-2">
               <p className="text-[10px] text-muted-foreground/60">Desenvolvido por</p>
               <p className="text-[11px] font-medium text-muted-foreground/80">Nobre Digital</p>
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
