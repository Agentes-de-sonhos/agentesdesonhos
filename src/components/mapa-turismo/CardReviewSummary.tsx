import type { MouseEvent } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAverage } from "@/lib/communityReviews";

interface CardReviewSummaryProps {
  average?: number | null;
  count?: number | null;
  onClick: (e: MouseEvent) => void;
  className?: string;
}

/**
 * Bloco central compacto do rodapé dos cards do Mapa do Turismo.
 * Sem avaliações: "Avaliar" + cinco estrelas vazias.
 * Com avaliações: estrelas + "4,8 (23)".
 */
export function CardReviewSummary({ average, count, onClick, className }: CardReviewSummaryProps) {
  const total = count ?? 0;
  const avgLabel = total > 0 ? formatAverage(average) : null;
  const filled = total > 0 ? Math.round(average ?? 0) : 0;

  return (
    <button
      type="button"
      data-testid="directory-supplier-rating"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      aria-label={
        avgLabel
          ? `Avaliação ${avgLabel} de 5 com ${total} ${total === 1 ? "avaliação" : "avaliações"}. Avaliar fornecedor`
          : "Avaliar fornecedor"
      }
      className={cn(
        "flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg text-xs min-w-0",
        "text-muted-foreground hover:text-amber-600 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {avgLabel ? (
        <>
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-foreground whitespace-nowrap">{avgLabel}</span>
          <span className="whitespace-nowrap">({total})</span>
        </>
      ) : (
        <>
          <span className="font-medium whitespace-nowrap hidden sm:inline">Avaliar</span>
          <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-3 w-3 text-muted-foreground/30" />
            ))}
          </span>
        </>
      )}
      {avgLabel !== null && filled > 0 && <span className="sr-only">{filled} estrelas</span>}
    </button>
  );
}