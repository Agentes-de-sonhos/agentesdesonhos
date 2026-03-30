import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
interface ReviewLike {
  rating: number;
  reaction: string | null;
  comment: string | null;
}

interface OperatorReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { rating: number; reaction?: string; comment?: string }) => void;
  isSubmitting: boolean;
  existingReview?: ReviewLike | null;
  operatorName: string;
}

export function OperatorReviewModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  existingReview,
  operatorName,
}: OperatorReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reaction, setReaction] = useState<string | undefined>();
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReaction(existingReview.reaction || undefined);
      setComment(existingReview.comment || "");
    } else {
      setRating(0);
      setReaction(undefined);
      setComment("");
    }
  }, [existingReview, open]);

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({ rating, reaction, comment: comment.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {existingReview ? "Editar Avaliação" : "Avaliar Empresa"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{operatorName}</p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nota em estrelas</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Reaction */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reação rápida</label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={reaction === "recommend" ? "default" : "outline"}
                className={`flex-1 rounded-xl gap-2 ${
                  reaction === "recommend"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "hover:border-emerald-300 hover:bg-emerald-50"
                }`}
                onClick={() => setReaction(reaction === "recommend" ? undefined : "recommend")}
              >
                <ThumbsUp className="h-4 w-4" />
                Recomendo
              </Button>
              <Button
                type="button"
                variant={reaction === "not_recommend" ? "default" : "outline"}
                className={`flex-1 rounded-xl gap-2 ${
                  reaction === "not_recommend"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "hover:border-rose-300 hover:bg-rose-50"
                }`}
                onClick={() => setReaction(reaction === "not_recommend" ? undefined : "not_recommend")}
              >
                <ThumbsDown className="h-4 w-4" />
                Não recomendo
              </Button>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Comentário <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte brevemente sua experiência com essa operadora..."
              className="rounded-xl resize-none min-h-[100px]"
              maxLength={500}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full rounded-xl"
          >
            {isSubmitting ? "Enviando..." : existingReview ? "Atualizar avaliação" : "Enviar avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
