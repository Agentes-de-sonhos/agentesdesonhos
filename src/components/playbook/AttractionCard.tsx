import { Star, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaybookAttraction } from "@/types/playbook";

const TAG_STYLES: Record<string, string> = {
  'Imperdível': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Mais vendido': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Experiência premium': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  'Para primeira viagem': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

interface AttractionCardProps {
  attraction: PlaybookAttraction;
}

export function AttractionCard({ attraction }: AttractionCardProps) {
  const hasRating = attraction.rating > 0;
  const hasPrice = attraction.price_from > 0;

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      {/* Top row: Category + Rating */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="text-[10px] font-medium uppercase tracking-wider">{attraction.category}</span>
        </div>
        {hasRating && (
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{attraction.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 mb-1.5">
        {attraction.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
        {attraction.short_description}
      </p>

      {/* Tags */}
      {attraction.tags && attraction.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {attraction.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                TAG_STYLES[tag] || "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="pt-2.5 border-t border-border/60 flex items-end justify-between">
        <span className="text-[10px] text-muted-foreground">A partir de</span>
        {hasPrice ? (
          <p className="text-base font-bold text-foreground">
            R$ {attraction.price_from.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ) : (
          <p className="text-xs font-medium text-muted-foreground italic">Consultar</p>
        )}
      </div>
    </div>
  );
}
