import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles,
  Map,
  Newspaper,
  User,
  ChevronLeft,
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
  Clock,
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

// Main menu items - first section
const mainMenuItems: MenuItem[] = [
  {
    title: "Mapa do Turismo",
    url: "/mapa-turismo",
    icon: Map,
    requiredFeature: "tourism_map",
  },
  {
    title: "EducaTravel Academy",
    url: "/educa-academy",
    icon: GraduationCap,
  },
  {
    title: "Materiais de Divulgação",
    url: "/materiais",
    icon: FileText,
    requiredFeature: "materials",
  },
  {
    title: "Bloqueios Aéreos",
    url: "/bloqueios-aereos",
    icon: Plane,
  },
  {
    title: "Agenda",
    url: "/agenda",
    icon: Calendar,
    requiredFeature: "agenda",
  },
  {
    title: "Notícias",
    url: "/noticias",
    icon: Newspaper,
    requiredFeature: "news",
  },
];

// Secondary menu items - after separator
const secondaryMenuItems: MenuItem[] = [
  {
    title: "CRM",
    url: "/crm",
    icon: Users,
    requiredFeature: "crm_basic",
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: Wallet,
  },
];

// Premium features section
const premiumMenuItems: MenuItem[] = [
  {
    title: "Gerar Orçamento",
    url: "/ferramentas-ia/gerar-orcamento",
    icon: Calculator,
    requiredFeature: "quote_generator",
  },
  {
    title: "Carteira Digital",
    url: "/ferramentas-ia/trip-wallet",
    icon: Wallet,
    requiredFeature: "trip_wallet",
  },
  {
    title: "Ferramentas IA",
    url: "/ferramentas-ia",
    icon: Sparkles,
    requiredFeature: "ai_tools",
  },
  {
    title: "Comunidade",
    url: "/comunidade",
    icon: Heart,
    requiredFeature: "community",
  },
];

// Coming Soon section
const comingSoonMenuItems: MenuItem[] = [
  {
    title: "Mentorias",
    url: "/mentorias",
    icon: GraduationCap,
  },
];

const profileMenuItem: MenuItem = {
  title: "Perfil",
  url: "/perfil",
  icon: User,
};

const adminMenuItem: MenuItem = {
  title: "Administração",
  url: "/admin",
  icon: Shield,
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();

  const handleMenuClick = (item: MenuItem, e: React.MouseEvent) => {
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      e.preventDefault();
      setUpgradeFeature(item.requiredFeature);
    }
  };

  const renderMenuItem = (item: MenuItem, isPremiumSection: boolean = false) => {
    const isActive = location.pathname === item.url || 
      (item.url === "/dashboard" && location.pathname === "/");
    const isLocked = item.requiredFeature && !hasFeature(item.requiredFeature);
    const showPremiumLock = isPremiumSection && isLocked;

    const menuLink = (
      <Link
        key={item.url}
        to={isLocked ? "#" : item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive && !isLocked
            ? "bg-primary text-primary-foreground shadow-md"
            : isLocked
              ? "opacity-60 cursor-pointer hover:opacity-70"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <div className="relative">
          <item.icon
            className={cn(
              "h-5 w-5 flex-shrink-0 transition-transform duration-200",
              !isActive && !isLocked && "group-hover:scale-110",
              isLocked && "text-muted-foreground"
            )}
          />
          {showPremiumLock && (
            <Lock className="h-3 w-3 absolute -top-1.5 -right-1.5 text-warning" />
          )}
        </div>
        {!collapsed && (
          <span className={cn("animate-fade-in truncate", isLocked && "text-muted-foreground")}>
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
          <TooltipContent side="right" className="bg-popover border">
            <p className="text-sm">Disponível nos planos Pro ou Premium</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuLink;
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
        <div className="flex-1 overflow-y-auto py-3">
          {/* Admin menu item if admin */}
          {isAdmin && (
            <nav className="flex flex-col gap-1 px-3 mb-2">
              {renderMenuItem(adminMenuItem, false)}
            </nav>
          )}

          {/* Main Navigation */}
          <nav className="flex flex-col gap-1 px-3">
            {mainMenuItems.map((item) => renderMenuItem(item, false))}
          </nav>

          {/* Visual Separator */}
          <div className="px-3 py-3">
            <Separator className="bg-sidebar-border" />
          </div>

          {/* Secondary Navigation (CRM, Financeiro) */}
          <nav className="flex flex-col gap-1 px-3">
            {secondaryMenuItems.map((item) => renderMenuItem(item, false))}
          </nav>

          {/* Premium Features Section */}
          <div className="px-3 mt-4">
            {!collapsed && (
              <div className="mb-2 px-3 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Recursos Premium
                </p>
              </div>
            )}
            <nav className="flex flex-col gap-1">
              {premiumMenuItems.map((item) => renderMenuItem(item, true))}
            </nav>
          </div>

          {/* Coming Soon Section */}
          <div className="px-3 mt-4">
            {!collapsed && (
              <div className="mb-2 px-3 pt-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground/70" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Em Breve
                </p>
              </div>
            )}
            <nav className="flex flex-col gap-1">
              {comingSoonMenuItems.map((item) => renderMenuItem(item, false))}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3 space-y-2">
          {/* Profile */}
          {renderMenuItem(profileMenuItem, false)}

          {/* Plan Badge */}
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
            {!collapsed && (
              <span className={cn(
                "text-xs font-medium",
                plan === "premium" && "text-warning",
                plan === "profissional" && "text-primary",
                plan === "essencial" && "text-muted-foreground"
              )}>
                Plano {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>
            )}
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center px-0"
            )}
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </Button>

          {/* Footer */}
          {!collapsed ? (
            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground/60">
                Desenvolvido por
              </p>
              <p className="text-[11px] font-medium text-muted-foreground/80">
                Nobre Digital Hub
              </p>
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