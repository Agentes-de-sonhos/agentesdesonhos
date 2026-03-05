import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaybookAttraction } from "@/types/playbook";

const TAG_STYLES: Record<string, string> = {
  'Imperdível': 'bg-red-500/90 text-white',
  'Mais vendido': 'bg-amber-500/90 text-white',
  'Experiência premium': 'bg-violet-600/90 text-white',
  'Para primeira viagem': 'bg-emerald-500/90 text-white',
};

interface AttractionCardProps {
  attraction: PlaybookAttraction;
}

export function AttractionCard({ attraction }: AttractionCardProps) {
  return (
    <div className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {attraction.image_url ? (
          <img
            src={attraction.image_url}
            alt={attraction.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <Star className="h-12 w-12" />
          </div>
        )}

        {/* Tags */}
        {attraction.tags && attraction.tags.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            {attraction.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-md",
                  TAG_STYLES[tag] || "bg-primary text-primary-foreground"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rating badge */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold text-foreground">{attraction.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2 flex-1">
            {attraction.name}
          </h3>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {attraction.short_description}
        </p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {attraction.category}
          </span>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">A partir de</span>
            <p className="text-sm font-bold text-foreground">
              ${attraction.price_from.toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
