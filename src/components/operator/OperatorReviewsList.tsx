import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OperatorReview } from "@/hooks/useOperatorReviews";

interface OperatorReviewsListProps {
  reviews: OperatorReview[];
  isLoading: boolean;
  isAdmin?: boolean;
  onDeleteReview?: (reviewId: string, reason?: string) => void;
  isDeleting?: boolean;
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

const MODERATION_REASONS = [
  { value: "inappropriate", label: "Conteúdo inapropriado" },
  { value: "unfair", label: "Avaliação injusta ou abusiva" },
  { value: "spam", label: "Spam ou uso indevido da plataforma" },
  { value: "other", label: "Outro motivo" },
];

export function OperatorReviewsList({
  reviews,
  isLoading,
  isAdmin = false,
  onDeleteReview,
  isDeleting = false,
}: OperatorReviewsListProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("");

  if (isLoading) return null;
  if (reviews.length === 0) return null;

  const handleConfirmDelete = () => {
    if (deleteTarget && onDeleteReview) {
      const reasonLabel = MODERATION_REASONS.find((r) => r.value === deleteReason)?.label || deleteReason;
      onDeleteReview(deleteTarget, reasonLabel || undefined);
      setDeleteTarget(null);
      setDeleteReason("");
    }
  };

  return (
    <>
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(review.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é irreversível. A avaliação será removida e a média será recalculada.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-foreground">Motivo da exclusão (opcional)</label>
            <Select value={deleteReason} onValueChange={setDeleteReason}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MODERATION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removendo..." : "Remover avaliação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
