import { Link, useLocation } from "react-router-dom";
import { Home, Building2, Megaphone, Map, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Início", url: "/dashboard-fornecedor", icon: Home },
  { title: "Parceiro", url: "/meu-perfil-empresa", icon: Building2 },
  { title: "Materiais", url: "/meus-materiais", icon: Megaphone },
  { title: "Academy", url: "/educa-academy", icon: GraduationCap },
  { title: "Mapa", url: "/mapa-turismo", icon: Map },
];

export function SupplierBottomNavBar() {
  const location = useLocation();
  const isActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 py-1 backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = isActive(item.url);
        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}