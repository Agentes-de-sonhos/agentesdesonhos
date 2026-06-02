import { Plane, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, Map, Package, Plus, Sparkles, PackageOpen, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/types/quote";
import { SERVICE_TYPE_LABELS, MULTI_OPTION_TYPES } from "@/types/quote";

interface CategoryDef {
  type: ServiceType;
  title: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
}

const CATEGORIES: CategoryDef[] = [
  { type: "flight",     title: "Passagem Aérea",   icon: Plane,          color: "bg-sky-100 text-sky-700",         iconColor: "text-sky-500" },
  { type: "hotel",      title: "Hospedagem",        icon: Hotel,          color: "bg-amber-100 text-amber-700",     iconColor: "text-amber-500" },
  { type: "car_rental", title: "Locação",           icon: Car,            color: "bg-emerald-100 text-emerald-700", iconColor: "text-emerald-500" },
  { type: "transfer",   title: "Transfer",          icon: ArrowRightLeft, color: "bg-indigo-100 text-indigo-700",   iconColor: "text-indigo-500" },
  { type: "attraction", title: "Ingressos",         icon: Ticket,         color: "bg-pink-100 text-pink-700",       iconColor: "text-pink-500" },
  { type: "insurance",  title: "Seguro",            icon: Shield,         color: "bg-rose-100 text-rose-700",       iconColor: "text-rose-500" },
  { type: "cruise",     title: "Cruzeiros",         icon: Ship,           color: "bg-cyan-100 text-cyan-700",       iconColor: "text-cyan-500" },
  { type: "circuit",    title: "Circuitos",         icon: Map,            color: "bg-violet-100 text-violet-700",   iconColor: "text-violet-500" },
  { type: "other",      title: "Outros",            icon: Package,        color: "bg-slate-100 text-slate-700",     iconColor: "text-slate-500" },
];

interface Props {
  countByType?: Record<string, number>;
  onSelect: (type: ServiceType) => void;
  onOpenAIImport?: () => void;
  showAIImport?: boolean;
  onOpenFullPackage?: () => void;
  showFullPackage?: boolean;
}

export function ServiceCategoryGrid({ countByType = {}, onSelect, onOpenAIImport, showAIImport = false, onOpenFullPackage, showFullPackage = true }: Props) {
  return (
    <div
      className="grid gap-3 w-full"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
    >
      {showFullPackage && onOpenFullPackage && (
        <button
          type="button"
          onClick={onOpenFullPackage}
          aria-label="Importar Pacote Completo"
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-semibold transition-all duration-200 border",
            "bg-gradient-to-br from-fuchsia-500/15 via-primary/15 to-sky-500/15 text-foreground",
            "border-primary/30 hover:scale-[1.02] hover:shadow-md hover:border-primary/60"
          )}
        >
          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/90 text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
            <Sparkles className="h-2.5 w-2.5" /> IA
          </span>
          <PackageOpen className="h-6 w-6 text-primary" />
          <span className="text-center leading-tight px-1">Pacote Completo</span>
        </button>
      )}

      {showAIImport && onOpenAIImport && (
      <button
        type="button"
        onClick={onOpenAIImport}
        aria-label="Importar com IA"
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border",
          "bg-gradient-to-br from-primary/15 to-primary/5 text-primary",
          "border-primary/20 hover:scale-[1.02] hover:shadow-md hover:border-primary/40"
        )}
      >
        <Sparkles className="h-6 w-6 text-primary" />
        <span className="text-center leading-tight px-1">Importar com IA</span>
      </button>
      )}

      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const count = countByType[cat.type] || 0;
        const showCount = MULTI_OPTION_TYPES.includes(cat.type) && count > 0;
        return (
          <button
            key={cat.type}
            type="button"
            onClick={() => onSelect(cat.type)}
            aria-label={`Adicionar ${SERVICE_TYPE_LABELS[cat.type]}`}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border",
              cat.color,
              "border-transparent hover:scale-[1.02] hover:shadow-md hover:border-border/60"
            )}
          >
            <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-foreground/70 shadow-sm opacity-80 group-hover:opacity-100">
              <Plus className="h-3 w-3" />
            </span>
            {showCount && (
              <span className="absolute top-2 left-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[10px] font-semibold shadow-sm">
                {count}
              </span>
            )}
            <Icon className={cn("h-6 w-6", cat.iconColor)} />
            <span className="text-center leading-tight px-1">{cat.title}</span>
          </button>
        );
      })}
    </div>
  );
}