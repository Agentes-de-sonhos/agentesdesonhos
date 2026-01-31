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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

const baseMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Ferramentas IA",
    url: "/ferramentas-ia",
    icon: Sparkles,
  },
  {
    title: "CRM",
    url: "/crm",
    icon: Users,
  },
  {
    title: "Mapa do Turismo",
    url: "/mapa-turismo",
    icon: Map,
  },
  {
    title: "Materiais de Divulgação",
    url: "/materiais",
    icon: FileText,
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
  },
  {
    title: "Notícias",
    url: "/noticias",
    icon: Newspaper,
  },
  {
    title: "Perfil",
    url: "/perfil",
    icon: User,
  },
];

const adminMenuItem = {
  title: "Administração",
  url: "/admin",
  icon: Shield,
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();

  const menuItems = isAdmin 
    ? [adminMenuItem, ...baseMenuItems] 
    : baseMenuItems;

  return (
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
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in truncate">{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>

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
  );
}
