import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LOW_STAR_GUIDANCE,
  REVIEW_COMMENT_LABEL,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_COMMENT_PLACEHOLDER,
  REVIEW_SCALE_HINT,
  allowsComment,
  eligibilityMessage,
  isSelectableRating,
  ratingLabel,
} from "@/lib/communityReviews";
import { trackReviewEvent } from "@/lib/reviewAnalytics";
import { useCommunityReviews, useReviewEligibility, type CommunityReview } from "@/hooks/useCommunityReviews";

interface CommunityReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierName: string;
  supplierSource: string;
  supplierId: string;
  surface?: "card" | "profile";
  existingReview?: CommunityReview | null;
}

/** Aviso exibido ao tocar nas estrelas 1 ou 2 — sem gravar nota. */
export function LowStarGuidanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl" data-testid="low-star-guidance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Info className="h-4 w-4 text-primary" aria-hidden="true" />
            {LOW_STAR_GUIDANCE.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            {LOW_STAR_GUIDANCE.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              onOpenChange(false);
              navigate(LOW_STAR_GUIDANCE.supportRoute);
            }}
          >
            {LOW_STAR_GUIDANCE.supportLabel}
          </Button>
          <Button className="rounded-xl" onClick={() => onOpenChange(false)}>
            {LOW_STAR_GUIDANCE.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Modal único de avaliação usado nos cards e nos perfis comerciais.
 * Escala visual de 5 estrelas, notas graváveis de 3 a 5, comentário positivo
 * apenas em 4/5 e sempre sujeito a moderação.
 */
export function CommunityReviewDialog({
  open,
  onOpenChange,
  supplierName,
  supplierSource,
  supplierId,
  surface = "card",
  existingReview,
}: CommunityReviewDialogProps) {
  const navigate = useNavigate();
  const { submitReview, deleteReview, myReview } = useCommunityReviews(supplierSource, supplierId);
  const { data: eligibility } = useReviewEligibility();
  const current = existingReview ?? myReview;

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(current?.rating ?? 0);
    setComment(current?.comment ?? "");
    setConfirmDelete(false);
    trackReviewEvent("review_modal_opened", {
      supplier_source: supplierSource,
      supplier_id: supplierId,
      surface,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current?.id]);

  const handleStarClick = (star: number) => {
    if (!isSelectableRating(star)) {
      setGuidanceOpen(true);
      trackReviewEvent("low_star_guidance_shown", {
        supplier_source: supplierSource,
        supplier_id: supplierId,
        surface,
      });
      return;
    }
    setRating(star);
  };

  const commentAllowed = allowsComment(rating);
  const willDropComment = rating === 3 && !!(current?.comment || comment.trim());
  const notEligible = eligibility && !eligibility.eligible;

  const handleSubmit = () => {
    if (!isSelectableRating(rating) || submitReview.isPending) return;
    const isUpdate = !!current;
    submitReview.mutate(
      { rating, comment: commentAllowed ? comment : null },
      {
        onSuccess: () => {
          trackReviewEvent(isUpdate ? "review_updated" : "review_submitted", {
            supplier_source: supplierSource,
            supplier_id: supplierId,
            rating,
            has_comment: commentAllowed && !!comment.trim(),
            surface,
          });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl" data-testid="community-review-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {current ? "Editar minha avaliação" : "Reconhecimento da comunidade"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {supplierName} · {REVIEW_SCALE_HINT}
            </DialogDescription>
          </DialogHeader>

          {notEligible ? (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {eligibilityMessage(eligibility?.reason)}
              </p>
              {eligibility?.reason === "incomplete_profile" && (
                <Button className="w-full rounded-xl" onClick={() => navigate("/configuracoes")}>
                  Completar meu perfil
                </Button>
              )}
              {eligibility?.reason === "sem_assinatura" && (
                <Button className="w-full rounded-xl" onClick={() => navigate("/planos")}>
                  Ver planos
                </Button>
              )}
              {eligibility?.reason === "sem_vinculo_agencia" && (
                <Button className="w-full rounded-xl" onClick={() => navigate("/configuracoes")}>
                  Configurar minha agência
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5 pt-1">
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Sua nota</span>
                <div
                  className="flex items-center gap-1.5"
                  role="radiogroup"
                  aria-label="Nota de 3 a 5 estrelas"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={
                        isSelectableRating(star)
                          ? `${star} estrelas — ${ratingLabel(star)}`
                          : `${star} estrela — fora da escala pública`
                      }
                      data-testid={`review-star-${star}`}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => handleStarClick(star)}
                      className="p-0.5 rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          star <= (hovered || rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                  {isSelectableRating(rating) && (
                    <span className="ml-2 text-sm font-medium text-foreground">
                      {ratingLabel(rating)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  As avaliações públicas do Mapa do Turismo vão de 3 a 5 estrelas.
                </p>
              </div>

              {commentAllowed && (
                <div className="space-y-2">
                  <label htmlFor="review-comment" className="text-sm font-medium text-foreground">
                    {REVIEW_COMMENT_LABEL}{" "}
                    <span className="font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  <Textarea
                    id="review-comment"
                    data-testid="review-comment-field"
                    value={comment}
                    maxLength={REVIEW_COMMENT_MAX_LENGTH}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={REVIEW_COMMENT_PLACEHOLDER}
                    className="rounded-xl resize-none min-h-[100px]"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Comentários passam por análise antes de ficarem públicos.</span>
                    <span data-testid="review-comment-counter">
                      {comment.length}/{REVIEW_COMMENT_MAX_LENGTH}
                    </span>
                  </div>
                </div>
              )}

              {willDropComment && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-3">
                  Na nota 3 estrelas não há comentário público. Ao salvar, seu comentário será removido.
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  data-testid="review-submit"
                  onClick={handleSubmit}
                  disabled={!isSelectableRating(rating) || submitReview.isPending}
                  className="w-full rounded-xl"
                >
                  {submitReview.isPending
                    ? "Enviando..."
                    : current
                      ? "Salvar alterações"
                      : "Enviar avaliação"}
                </Button>
                {current && (
                  <>
                    {confirmDelete ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                        <p className="text-xs text-foreground">
                          Excluir sua avaliação deste fornecedor?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-lg"
                            onClick={() => setConfirmDelete(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 rounded-lg"
                            disabled={deleteReview.isPending}
                            data-testid="review-delete-confirm"
                            onClick={() =>
                              deleteReview.mutate(current.id, {
                                onSuccess: () => {
                                  trackReviewEvent("review_deleted", {
                                    supplier_source: supplierSource,
                                    supplier_id: supplierId,
                                    surface,
                                  });
                                  onOpenChange(false);
                                },
                              })
                            }
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="review-delete"
                        className="w-full rounded-xl text-muted-foreground hover:text-destructive gap-2"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Excluir minha avaliação
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LowStarGuidanceDialog open={guidanceOpen} onOpenChange={setGuidanceOpen} />
    </>
  );
}