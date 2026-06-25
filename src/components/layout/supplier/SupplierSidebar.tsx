import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Building2,
  Megaphone,
  Newspaper,
  GraduationCap,
  Map,
  ChevronLeft,
  Headset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SupplierMenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const items: SupplierMenuItem[] = [
  { title: "Início", url: "/dashboard-fornecedor", icon: Home },
  { title: "Perfil do Parceiro", url: "/meu-perfil-empresa", icon: Building2 },
  { title: "Materiais de Divulgação", url: "/meus-materiais", icon: Megaphone },
  { title: "Radar do Turismo", url: "/noticias", icon: Newspaper },
  { title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
  { title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map },
  { title: "Suporte", url: "/suporte", icon: Headset },
];

export function SupplierSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();

  const isActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + "/");

  const renderItem = (item: SupplierMenuItem) => {
    const active = isActive(item.url);
    const link = (
      <Link
        key={item.url}
        to={item.url}
        onClick={() => setCollapsed(true)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
          active
            ? "bg-primary/10 text-primary border-l-[3px] border-primary font-semibold"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.url} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return link;
  };

  return (
    <aside
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={cn(
        "fixed left-0 top-0 z-[60] hidden h-screen flex-col border-r border-sidebar-border bg-sidebar shadow-xl transition-all duration-300 lg:flex",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed && (
          <span className="font-display text-sm font-semibold text-sidebar-foreground">
            Painel do Parceiro
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed((c) => !c)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {items.map(renderItem)}
      </nav>
    </aside>
  );
}