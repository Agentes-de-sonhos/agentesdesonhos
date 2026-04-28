import { useState } from "react";
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
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Receptivos ocultados temporariamente do Mapa do Turismo (não excluído)
  // { title: "Receptivos", icon: MapPin, category: "Receptivos", color: "bg-orange-100 text-orange-700", iconColor: "text-orange-500" },
  { title: "Guias", icon: Users, category: "Guias", color: "bg-teal-100 text-teal-700", iconColor: "text-teal-500" },
];

export function MapaTurismoCard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-start justify-between gap-3 sm:justify-start sm:flex-shrink-0">
            <div className="w-fit">
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Mapa do Turismo
              </h2>
              <div className="mt-2 h-1 w-full rounded-full bg-primary" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 text-muted-foreground hover:text-foreground transition-transform sm:hidden"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
              aria-expanded={!collapsed}
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 sm:flex-1 min-w-0 w-full">
            {/* Engagement teaser — inline com o título, ocupa todo espaço restante */}
            <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 space-y-0.5 min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-tight">🌍 Encontre seus parceiros ideais</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Busque, filtre e conecte-se com fornecedores do turismo em poucos cliques.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground transition-transform hidden sm:inline-flex flex-shrink-0"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
              aria-expanded={!collapsed}
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
            </Button>
          </div>
        </div>

        {!collapsed && (
        <div
          className="grid gap-3 w-full"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
          }}
        >
          {CATEGORIES_DATA.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.category}
                onClick={() =>
                  navigate(`/mapa-turismo?categoria=${encodeURIComponent(cat.category)}`)
                }
                aria-label={`Acessar ${cat.title}`}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border",
                  cat.color,
                  "border-transparent hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                )}
              >
                <Icon className={cn("h-6 w-6", cat.iconColor)} />
                <span className="text-center leading-tight px-1">{cat.title}</span>
              </button>
            );
          })}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
