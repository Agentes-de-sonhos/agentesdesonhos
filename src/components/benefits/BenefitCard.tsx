import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, Building2, MapPin } from "lucide-react";
import { BENEFIT_CATEGORIES } from "@/types/benefits";
import type { Benefit } from "@/types/benefits";

interface BenefitCardProps {
  benefit: Benefit;
  userConfirmationType: string | null;
  onConfirm: (type: "works" | "not_available") => void;
  onViewDetails: () => void;
}

export function BenefitCard({ benefit, userConfirmationType, onConfirm, onViewDetails }: BenefitCardProps) {
  const categoryLabel = BENEFIT_CATEGORIES.find((c) => c.value === benefit.category)?.label || benefit.category;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onViewDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewDetails();
        }
      }}
      className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <CardContent className="p-5 space-y-4">
        {/* Header: company + category */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {benefit.company_logo_url ? (
              <img src={benefit.company_logo_url} alt={benefit.company_name} loading="lazy" decoding="async" className="h-20 w-20 rounded-lg object-contain bg-muted p-1" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">{benefit.company_name}</p>
              <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{benefit.title}</h3>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">{categoryLabel}</Badge>
        </div>

        {/* Description */}
        {benefit.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{benefit.short_description}</p>
        )}

        {/* Destination + Tags */}
        <div className="flex flex-wrap items-center gap-2">
          {benefit.destination && (
            <Badge variant="outline" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {benefit.destination}
            </Badge>
          )}
          {benefit.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs bg-muted/50">{tag}</Badge>
          ))}
        </div>

        {/* Footer: confirmations only (sharer info removed) */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm("works"); }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
              userConfirmationType === "works"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{benefit.confirmations_count}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
