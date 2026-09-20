import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Home,
  Menu,
  PlusSquare,
  ShoppingCart,
  Users,
  Users2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MobileDrawerMenu } from "./MobileDrawerMenu";
import { CreatePostForm } from "@/components/community/CreatePostForm";
import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useSubscription } from "@/hooks/useSubscription";
import { usePermissions } from "@/hooks/usePermissions";
import { useOpenInternalWindow } from "@/workspace/useOpenInternalWindow";
import { canAccessRoute } from "@/lib/routePermissions";

type BottomNavKey = "inicio" | "rede" | "publicacao" | "gestao" | "menu";

export const MOBILE_BOTTOM_NAV_ITEMS: { key: BottomNavKey; label: string }[] = [
  { key: "inicio", label: "Início" },
  { key: "rede", label: "Minha Rede" },
  { key: "publicacao", label: "Publicação" },
  { key: "gestao", label: "Gestão" },
  { key: "menu", label: "Menu" },
];

const MANAGEMENT_SHEET_ITEMS = [
  { label: "Clientes", icon: Users, path: "/gestao-clientes/clientes" },
  { label: "Oportunidades", icon: ShoppingCart, path: "/gestao-clientes/funil" },
  { label: "Operações", icon: CalendarDays, path: "/gestao-clientes/operacoes" },
];

const ICONS: Record<BottomNavKey, React.ComponentType<{ className?: string }>> = {
  inicio: Home,
  rede: Users2,
  publicacao: PlusSquare,
  gestao: ShoppingCart,
  menu: Menu,
};

/**
 * Barra inferior mobile da plataforma Agentes de Sonhos com cinco itens fixos.
 * Não é usada pelo Site Lab Base nem pelos white-labels das agências.
 */
export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const visible = useScrollDirection();
  const { plan, isPromotor } = useSubscription();
  const { can } = usePermissions();
  const openInternalWindow = useOpenInternalWindow();
  const { createPost, isCreating } = useCommunityFeed({ pageSize: 5, enabled: false });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);

  const homePath = !isPromotor && plan === "start" ? "/dashboard-start" : "/dashboard";
  const networkPath = "/comunidade/minha-rede";

  const isActive = (key: BottomNavKey) => {
    if (key === "inicio") return location.pathname === homePath || location.pathname === "/dashboard";
    if (key === "rede") return location.pathname.startsWith("/comunidade");
    if (key === "publicacao") return composerOpen;
    if (key === "gestao") return managementOpen || location.pathname.startsWith("/gestao-clientes");
    return drawerOpen;
  };

  const handleClick = (key: BottomNavKey) => {
    if (key === "menu") {
      setManagementOpen(false);
      setDrawerOpen(true);
      return;
    }
    if (key === "gestao") {
      setManagementOpen((prev) => !prev);
      return;
    }
    setManagementOpen(false);
    if (key === "publicacao") {
      setComposerOpen(true);
      return;
    }
    navigate(key === "inicio" ? homePath : networkPath);
  };

  const managementItems = MANAGEMENT_SHEET_ITEMS.filter((item) => canAccessRoute(item.path, can));

  return (
    <>
      {managementOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setManagementOpen(false)} />
      )}

      {managementOpen && (
        <div
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-50 rounded-2xl border border-border bg-card shadow-2xl lg:hidden"
          role="dialog"
          aria-label="Gestão"
          data-mobile-management-sheet
        >
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gestão</span>
            <button type="button" aria-label="Fechar Gestão" onClick={() => setManagementOpen(false)} className="p-1 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 px-2 pb-2 pt-1" aria-label="Atalhos de gestão">
            {managementItems.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum atalho disponível.</p>
            ) : (
              managementItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    setManagementOpen(false);
                    openInternalWindow(item.path, item.label);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))
            )}
          </nav>
        </div>
      )}

      <nav
        aria-label="Navegação principal"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "border-t border-border bg-card/95 backdrop-blur-lg",
          "transition-transform duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        data-mobile-bottom-nav
      >
        <div className="flex h-16 items-center justify-around px-1">
          {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.key];
            const active = isActive(item.key);
            return (
              <button
                key={item.key}
                type="button"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => handleClick(item.key)}
                className={cn(
                  "mx-0.5 flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-lg transition-all duration-200 active:scale-95",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                </span>
                <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <PostComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onSubmit={(data) => createPost(data)}
        isCreating={isCreating}
      />

      <MobileDrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
