import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Sparkles, Clock, Flag, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REPORT_REASONS,
  REVIEW_SCALE_HINT,
  formatAverage,
  ratingLabel,
} from "@/lib/communityReviews";
import { trackReviewEvent } from "@/lib/reviewAnalytics";
import { useCommunityReviews, type CommunityReview } from "@/hooks/useCommunityReviews";
import { CommunityReviewDialog } from "@/components/mapa-turismo/CommunityReviewDialog";

const PAGE_SIZE = 5;

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn(
            size === "md" ? "h-4 w-4" : "h-3.5 w-3.5",
            star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20",
          )}
        />
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface CommunityRecognitionSectionProps {
  supplierSource: string;
  supplierId: string;
  supplierName: string;
}

/**
 * Seção "Reconhecimento da comunidade" dos perfis comerciais do Mapa do Turismo.
 * Exibida logo após "Materiais de divulgação" em todos os tipos de fornecedor.
 */
export function CommunityRecognitionSection({
  supplierSource,
  supplierId,
  supplierName,
}: CommunityRecognitionSectionProps) {
  const { reviews, isLoading, myReview, count, average, reportReview } = useCommunityReviews(
    supplierSource,
    supplierId,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [reportTarget, setReportTarget] = useState<CommunityReview | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const visibleReviews = useMemo(() => reviews.slice(0, visible), [reviews, visible]);
  const avgLabel = formatAverage(average);

  const handleReport = () => {
    if (!reportTarget || !reportReason) return;
    const label = REPORT_REASONS.find((r) => r.value === reportReason)?.label || reportReason;
    reportReview.mutate(
      { reviewId: reportTarget.id, reason: label, details: reportDetails.trim() || null },
      {
        onSuccess: () => {
          trackReviewEvent("review_comment_reported", {
            supplier_source: supplierSource,
            supplier_id: supplierId,
            surface: "profile",
          });
          setReportTarget(null);
          setReportReason("");
          setReportDetails("");
        },
      },
    );
  };

  return (
    <>
      <Card
        data-testid="community-recognition-section"
        className="rounded-2xl border-border/60 shadow-sm bg-card"
      >
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                </div>
                Reconhecimento da comunidade
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {count > 0 ? (
                  <>
                    <span className="text-xl font-bold text-foreground">{avgLabel}</span>
                    <StarRow rating={Math.round(average)} size="md" />
                    <span className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "avaliação" : "avaliações"}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Ainda sem avaliações</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{REVIEW_SCALE_HINT}</p>
            </div>
            <Button
              size="sm"
              className="rounded-xl gap-2"
              data-testid="community-recognition-cta"
              onClick={() => setDialogOpen(true)}
            >
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              {myReview ? "Editar minha avaliação" : "Avaliar fornecedor"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando avaliações...</p>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                Seja o primeiro a reconhecer este parceiro
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Compartilhe uma experiência positiva e ajude outros agentes a vender com confiança.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleReviews.map((review) => {
                const displayName = review.author_name || "Agente";
                const initials = displayName.slice(0, 2).toUpperCase();
                const showComment = !!review.comment && review.comment_status === "approved";
                const pending = review.is_mine && review.comment_status === "pending";
                const rejected = review.is_mine && review.comment_status === "rejected";

                return (
                  <div
                    key={review.id}
                    data-testid="community-review-item"
                    className={cn(
                      "flex gap-3 p-3 rounded-xl border",
                      review.is_mine
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30 border-border/40",
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={review.author_avatar_url || undefined} alt="" />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground break-words">
                            {displayName}
                          </span>
                          {review.author_agency_name && (
                            <span className="block text-xs text-muted-foreground break-words">
                              {review.author_agency_name}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(review.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StarRow rating={review.rating} />
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {ratingLabel(review.rating)}
                        </Badge>
                        {review.is_mine && (
                          <Badge variant="outline" className="text-[10px]">
                            Sua avaliação
                          </Badge>
                        )}
                      </div>

                      {showComment && (
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line break-words">
                          {review.comment}
                        </p>
                      )}

                      {pending && (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 space-y-1">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            Comentário em análise — visível apenas para você
                          </p>
                          <p className="text-sm text-foreground/70 whitespace-pre-line break-words">
                            {review.comment}
                          </p>
                        </div>
                      )}

                      {rejected && (
                        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2.5 space-y-1">
                          <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                            Comentário não aprovado
                            {review.moderation_reason ? ` — ${review.moderation_reason}` : ""}
                          </p>
                          <p className="text-sm text-foreground/70 whitespace-pre-line break-words">
                            {review.comment}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Você pode editar o texto e enviar para nova análise.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-1 pt-0.5">
                        {review.is_mine ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1.5"
                            data-testid="community-review-edit"
                            onClick={() => setDialogOpen(true)}
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                            Editar / excluir
                          </Button>
                        ) : (
                          showComment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
                              data-testid="community-review-report"
                              onClick={() => setReportTarget(review)}
                            >
                              <Flag className="h-3 w-3" aria-hidden="true" />
                              Denunciar
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {reviews.length > visible && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  data-testid="community-review-more"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Ver mais avaliações ({reviews.length - visible})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CommunityReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplierName={supplierName}
        supplierSource={supplierSource}
        supplierId={supplierId}
        surface="profile"
      />

      <Dialog open={!!reportTarget} onOpenChange={(open) => !open && setReportTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Denunciar comentário</DialogTitle>
            <DialogDescription>
              A denúncia é enviada para análise da moderação. O comentário permanece visível até a
              conclusão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={reportDetails}
              maxLength={500}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Detalhes (opcional)"
              className="rounded-xl resize-none min-h-[80px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setReportTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl"
              disabled={!reportReason || reportReview.isPending}
              onClick={handleReport}
            >
              {reportReview.isPending ? "Enviando..." : "Enviar denúncia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}