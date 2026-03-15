import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OperatorReview } from "@/hooks/useOperatorReviews";

interface OperatorReviewsListProps {
  reviews: OperatorReview[];
  isLoading: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

export function OperatorReviewsList({ reviews, isLoading }: OperatorReviewsListProps) {
  if (isLoading) return null;
  if (reviews.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Star className="h-4 w-4 text-amber-500" />
          </div>
          Avaliações ({reviews.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.map((review) => {
            const displayName = review.profile?.agency_name || review.profile?.name || "Agente";
            const initials = displayName.slice(0, 2).toUpperCase();

            return (
              <div
                key={review.id}
                className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/40"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={review.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {displayName}
                      </span>
                      {review.reaction && (
                        <span className="shrink-0">
                          {review.reaction === "recommend" ? (
                            <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <ThumbsDown className="h-3.5 w-3.5 text-rose-500" />
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  <StarRating rating={review.rating} />

                  {review.comment && (
                    <p className="text-sm text-foreground/80 leading-relaxed mt-1">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
