import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, PlusCircle, MessageCircleQuestion, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { MobileDrawerMenu } from "./MobileDrawerMenu";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: "menu";
}

const navItems: NavItem[] = [
  { label: "Início", icon: Home, path: "/dashboard" },
  { label: "Clientes", icon: Users, path: "/gestao-clientes" },
  { label: "Criar", icon: PlusCircle, path: "/carteira-digital" },
  { label: "Comunidade", icon: MessageCircleQuestion, path: "/perguntas-respostas" },
  { label: "Menu", icon: Menu, action: "menu" },
];

export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const visible = useScrollDirection();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleClick = (item: NavItem) => {
    if (item.action === "menu") {
      setDrawerOpen(true);
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "bg-card/95 backdrop-blur-lg border-t border-border",
          "transition-transform duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const active = item.action === "menu" ? drawerOpen : isActive(item.path);

            return (
              <button
                key={item.label}
                onClick={() => handleClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full",
                  "transition-all duration-200 active:scale-95",
                  "rounded-lg mx-0.5",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                    active && "bg-primary/10"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                </div>
                <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Full Drawer Menu */}
      <MobileDrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
