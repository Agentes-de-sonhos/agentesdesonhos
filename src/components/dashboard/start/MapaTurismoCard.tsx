import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plane,
  Building2,
  Hotel,
  Car,
  Ship,
  Shield,
  Ticket,
  MapPin,
  Users,
  Globe,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DIRECTORY_ROOT, categoryListingRoute } from "@/lib/directoryNavigation";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";

interface CategoryDef {
  title: string;
  icon: LucideIcon;
  category: string;
  color: string;
  iconColor: string;
}

// Mirror of CATEGORIES_DATA in src/pages/MapaTurismo.tsx (inactive style only)
const CATEGORIES_DATA: CategoryDef[] = [
  { title: "Operadoras", icon: Plane, category: "Operadoras de turismo", color: "bg-blue-100 text-blue-700", iconColor: "text-blue-500" },
  { title: "Consolidadoras", icon: Building2, category: "Consolidadoras", color: "bg-violet-100 text-violet-700", iconColor: "text-violet-500" },
  { title: "Cias Aéreas", icon: Plane, category: "Companhias aéreas", color: "bg-sky-100 text-sky-700", iconColor: "text-sky-500" },
  { title: "Hospedagem", icon: Hotel, category: "Hospedagem", color: "bg-amber-100 text-amber-700", iconColor: "text-amber-500" },
  { title: "Locadoras", icon: Car, category: "Locadoras de veículos", color: "bg-emerald-100 text-emerald-700", iconColor: "text-emerald-500" },
  { title: "Cruzeiros", icon: Ship, category: "Cruzeiros", color: "bg-cyan-100 text-cyan-700", iconColor: "text-cyan-500" },
  { title: "Seguros", icon: Shield, category: "Seguros viagem", color: "bg-rose-100 text-rose-700", iconColor: "text-rose-500" },
  { title: "Parques", icon: Ticket, category: "Parques e atrações", color: "bg-pink-100 text-pink-700", iconColor: "text-pink-500" },
  { title: "Receptivos", icon: MapPin, category: "Receptivos", color: "bg-orange-100 text-orange-700", iconColor: "text-orange-500" },
  { title: "Guias", icon: Users, category: "Guias", color: "bg-teal-100 text-teal-700", iconColor: "text-teal-500" },
];

interface MapaTurismoCardProps {
  alwaysExpanded?: boolean;
}

export function MapaTurismoCard({ alwaysExpanded = false }: MapaTurismoCardProps = {}) {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  const scrollBy = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 200);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-3 @container min-w-0">
        <DashboardSectionHeader
          icon={Globe}
          title="Mapa do Turismo"
          description="Encontre e conecte-se com os melhores fornecedores do turismo."
          iconClassName="text-primary"
          accentClassName="bg-primary"
          cta={{
            to: DIRECTORY_ROOT,
            label: "Ver Mapa do Turismo",
            shortLabel: "Ver mapa",
            tabTitle: "Mapa do Turismo",
            className: "text-primary",
          }}
        />

        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Rolar para a esquerda"
              onClick={() => scrollBy("left")}
              className="hidden sm:flex @[62rem]:!hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-background/95 shadow-md border border-border hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Rolar para a direita"
              onClick={() => scrollBy("right")}
              className="hidden sm:flex @[62rem]:!hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-background/95 shadow-md border border-border hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 sm:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden @[62rem]:grid @[62rem]:grid-cols-10 @[62rem]:gap-3 @[68rem]:gap-4 @[62rem]:overflow-visible @[62rem]:px-0 @[62rem]:mx-auto @[62rem]:max-w-[1480px] @[62rem]:justify-items-center"
          >
            {CATEGORIES_DATA.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.category}
                  onClick={() => navigate(categoryListingRoute(cat.category) ?? DIRECTORY_ROOT)}
                  aria-label={`Acessar ${cat.title}`}
                  className={cn(
                    "snap-start shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl w-[92px] h-[92px] sm:w-[104px] sm:h-[104px] text-xs font-medium transition-all duration-200 border border-transparent",
                    "@[62rem]:w-full @[62rem]:h-auto @[62rem]:aspect-square @[62rem]:max-w-[144px] @[68rem]:text-[13px]",
                    cat.color,
                    "hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                  )}
                >
                  <Icon className={cn("h-6 w-6 @[68rem]:h-7 @[68rem]:w-7", cat.iconColor)} />
                  <span className="text-center leading-tight px-1">{cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
