import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { Feature } from "@/types/subscription";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature?: Feature;
}

const baseMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Ferramentas IA",
    url: "/ferramentas-ia",
    icon: Sparkles,
    requiredFeature: "ai_tools",
  },
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
    requiredFeature: "financial",
  },
  {
    title: "Educa Academy",
    url: "/educa-academy",
    icon: GraduationCap,
  },
  {
    title: "Mapa do Turismo",
    url: "/mapa-turismo",
    icon: Map,
    requiredFeature: "tourism_map",
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
  {
    title: "Perfil",
    url: "/perfil",
    icon: User,
  },
];

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

  const menuItems = isAdmin 
    ? [adminMenuItem, ...baseMenuItems] 
    : baseMenuItems;

  const handleMenuClick = (item: MenuItem, e: React.MouseEvent) => {
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      e.preventDefault();
      setUpgradeFeature(item.requiredFeature);
    }
  };

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
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

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url || 
              (item.url === "/dashboard" && location.pathname === "/");
            const isLocked = item.requiredFeature && !hasFeature(item.requiredFeature);
            
            return (
              <Link
                key={item.url}
                to={isLocked ? "#" : item.url}
                onClick={(e) => handleMenuClick(item, e)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive && !isLocked
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isLocked
                      ? "text-muted-foreground/50 hover:bg-muted/50 cursor-pointer"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <div className="relative">
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                      !isActive && !isLocked && "group-hover:scale-110",
                      isLocked && "opacity-50"
                    )}
                  />
                  {isLocked && (
                    <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                  )}
                </div>
                {!collapsed && (
                  <span className={cn("animate-fade-in truncate", isLocked && "opacity-50")}>
                    {item.title}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Plan Badge */}
        {!collapsed && (
          <div className="absolute bottom-28 left-3 right-3">
            <div className={cn(
              "rounded-lg p-2 text-center text-xs font-medium",
              plan === "premium" && "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-400",
              plan === "profissional" && "bg-primary/10 text-primary",
              plan === "essencial" && "bg-muted text-muted-foreground"
            )}>
              Plano {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="absolute bottom-20 left-3 right-3">
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
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="absolute bottom-4 left-4 right-4 animate-fade-in">
            <div className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Produtividade para o trade turístico
              </p>
            </div>
          </div>
        )}
      </aside>

      <UpgradeDialog
        open={upgradeFeature !== null}
        onOpenChange={(open) => !open && setUpgradeFeature(null)}
        requiredFeature={upgradeFeature || undefined}
      />
    </>
  );
}