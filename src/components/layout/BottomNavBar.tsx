import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home, BookOpen, PlusCircle, Users, Menu, X,
  GraduationCap, Newspaper, Map, Compass, Tag, CalendarDays,
  Wallet, Calculator, Route, FileText,
  ShoppingCart, Lock, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { MobileDrawerMenu } from "./MobileDrawerMenu";
import { useSubscription } from "@/hooks/useSubscription";
import { Feature } from "@/types/subscription";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { useGamificationLite } from "@/hooks/useGamificationLite";

interface SubMenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  requiredFeature?: Feature;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: "menu";
  subItems?: SubMenuItem[];
  color?: string;
  bgColor?: string;
}

const navItems: NavItem[] = [
  { label: "Início", icon: Home, path: "/dashboard" },
  {
    label: "Conhecimento", icon: BookOpen,
    color: "text-blue-600", bgColor: "bg-blue-50",
    subItems: [
      { label: "EducaTravel Academy", icon: GraduationCap, path: "/educa-academy" },
      { label: "Notícias do Trade", icon: Newspaper, path: "/noticias", requiredFeature: "news" },
    ],
  },
  {
    label: "Criar", icon: PlusCircle,
    color: "text-violet-600", bgColor: "bg-violet-50",
    subItems: [
      { label: "Carteira Digital", icon: Wallet, path: "/ferramentas-ia/trip-wallet", requiredFeature: "trip_wallet" },
      { label: "Orçamento", icon: Calculator, path: "/ferramentas-ia/gerar-orcamento", requiredFeature: "quote_generator" },
      { label: "Roteiros", icon: Route, path: "/ferramentas-ia/criar-roteiro", requiredFeature: "itinerary" },
      { label: "Conteúdo", icon: FileText, path: "/ferramentas-ia/criar-conteudo", requiredFeature: "content_creator" },
    ],
  },
  {
    label: "Clientes", icon: Users,
    color: "text-cyan-600", bgColor: "bg-cyan-50",
    subItems: [
      { label: "Gestão de Clientes", icon: Users, path: "/gestao-clientes/clientes", requiredFeature: "crm_basic" },
      { label: "Oportunidades", icon: ShoppingCart, path: "/gestao-clientes/funil", requiredFeature: "crm_basic" },
      { label: "Meta de Vendas", icon: Calculator, path: "/gestao-clientes/metas", requiredFeature: "financial" },
    ],
  },
  { label: "Menu", icon: Menu, action: "menu" },
];

// Start (free) plan users get a simplified bottom nav focused on free features
const startNavItems: NavItem[] = [
  { label: "Início", icon: Home, path: "/dashboard-start" },
  {
    label: "Conhecimento", icon: BookOpen,
    color: "text-blue-600", bgColor: "bg-blue-50",
    subItems: [
      { label: "EducaTravel Academy", icon: GraduationCap, path: "/educa-academy" },
      { label: "Notícias do Trade", icon: Newspaper, path: "/noticias", requiredFeature: "news" },
    ],
  },
  {
    label: "Criar", icon: PlusCircle,
    color: "text-violet-600", bgColor: "bg-violet-50",
    subItems: [
      { label: "Roteiros", icon: Route, path: "/ferramentas-ia/criar-roteiro", requiredFeature: "itinerary" },
    ],
  },
  { label: "Materiais", icon: Megaphone, path: "/materiais" },
  { label: "Menu", icon: Menu, action: "menu" },
];

export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const visible = useScrollDirection();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const { hasFeature, plan, isPromotor } = useSubscription();
  const { trackSectionVisit } = useGamificationLite();

  const isStartPlan = !isPromotor && plan === "start";
  const items = isStartPlan ? startNavItems : navItems;

  const isActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    }
    if (item.subItems) {
      return item.subItems.some(
        (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
      );
    }
    return false;
  };

  const handleClick = (item: NavItem) => {
    if (item.action === "menu") {
      setActivePopup(null);
      setDrawerOpen(true);
      return;
    }
    if (item.subItems) {
      setActivePopup((prev) => (prev === item.label ? null : item.label));
      return;
    }
    if (item.path) {
      setActivePopup(null);
      navigate(item.path);
    }
  };

  const handleSubItemClick = (sub: SubMenuItem) => {
    if (sub.requiredFeature && !hasFeature(sub.requiredFeature)) {
      setUpgradeFeature(sub.requiredFeature);
      return;
    }
    trackSectionVisit(sub.path);
    setActivePopup(null);
    navigate(sub.path);
  };

  const activeItem = items.find((i) => i.label === activePopup);

  return (
    <>
      {/* Popup overlay */}
      {activePopup && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setActivePopup(null)}
        />
      )}

      {/* Sub-items popup */}
      {activeItem?.subItems && (
        <div
          className={cn(
            "fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-50 lg:hidden",
            "rounded-2xl border border-border bg-card shadow-2xl",
            "animate-fade-in"
          )}
        >
          <div className={cn("flex items-center justify-between px-4 pt-3 pb-1")}>
            <div className="flex items-center gap-2">
              <activeItem.icon className={cn("h-4 w-4", activeItem.color)} />
              <span className={cn("text-xs font-bold uppercase tracking-wider", activeItem.color)}>
                {activeItem.label}
              </span>
            </div>
            <button onClick={() => setActivePopup(null)} className="p-1 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="px-2 pb-2 pt-1 flex flex-col gap-0.5">
            {activeItem.subItems.map((sub) => {
              const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path + "/");
              const isLocked = sub.requiredFeature && !hasFeature(sub.requiredFeature);
              return (
                <button
                  key={sub.path}
                  onClick={() => handleSubItemClick(sub)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left w-full",
                    isSubActive && !isLocked
                      ? cn(activeItem.bgColor, activeItem.color, "font-semibold")
                      : isLocked
                        ? "opacity-50 text-muted-foreground"
                        : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <sub.icon className="h-5 w-5" />
                    {isLocked && <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />}
                  </div>
                  <span className="truncate">{sub.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

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
          {items.map((item) => {
            const active = item.action === "menu"
              ? drawerOpen
              : activePopup === item.label
                ? true
                : isActive(item);

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

      <UpgradeDialog
        open={upgradeFeature !== null}
        onOpenChange={(open) => !open && setUpgradeFeature(null)}
        requiredFeature={upgradeFeature || undefined}
      />
    </>
  );
}
