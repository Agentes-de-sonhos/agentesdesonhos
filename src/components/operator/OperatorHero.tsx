import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OperatorHeroProps {
  name: string;
  category: string;
  logoUrl?: string | null;
  averageRating?: number;
  totalReviews?: number;
  onReviewClick?: () => void;
}

export function OperatorHero({
  name,
  logoUrl,
  averageRating = 0,
  totalReviews = 0,
  onReviewClick,
}: OperatorHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-border/60 p-8 sm:p-10">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Logo + Name */}
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center shadow-sm overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {name.charAt(0)}
              </span>
            )}
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl tracking-tight">
              {name}
            </h1>
            <p className="text-muted-foreground mt-1">Operadora de Turismo</p>
          </div>
        </div>

        {/* Right: Rating summary */}
        <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Avaliação das Agências
            </p>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(averageRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
              {totalReviews > 0 && (
                <span className="text-sm font-semibold text-foreground">
                  {averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalReviews === 0
                ? "Nenhuma avaliação ainda"
                : `${totalReviews} avaliação${totalReviews !== 1 ? "ões" : ""}`}
            </p>
          </div>

          <Button
            onClick={onReviewClick}
            variant="outline"
            className="rounded-xl gap-2 border-amber-300/60 hover:border-amber-400 hover:bg-amber-50 text-amber-700 transition-all"
          >
            <Star className="h-4 w-4" />
            Avaliar Empresa
          </Button>
        </div>
      </div>
    </div>
  );
}
