import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdvisorReviews, AdvisorItemType, ReviewType } from "@/hooks/useAdvisorReviews";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemType: AdvisorItemType;
  itemName: string;
  reviewType: ReviewType;
}

const ITEM_TYPE_LABELS: Record<AdvisorItemType, string> = {
  hotel: "hotel",
  attraction: "atração",
  experience: "experiência",
  dining: "restaurante",
  shopping: "loja",
};

export function AdvisorReviewDialog({ open, onOpenChange, itemId, itemType, itemName, reviewType }: Props) {
  const [comment, setComment] = useState("");
  const { submitReview } = useAdvisorReviews(itemId, itemType);

  const isNegative = reviewType === "not_recommend";
  const Icon = isNegative ? ThumbsDown : ThumbsUp;
  const label = ITEM_TYPE_LABELS[itemType];

  const handleSubmit = () => {
    if (!comment.trim()) {
      toast.error("Por favor, escreva um comentário.");
      return;
    }
    submitReview.mutate(
      { review_type: reviewType, comment: comment.trim() },
      {
        onSuccess: () => {
          setComment("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${isNegative ? "text-destructive" : "text-success"}`} />
            {isNegative ? "Não recomendar" : "Recomendar"} {label}
          </DialogTitle>
          <DialogDescription>
            {isNegative
              ? `Compartilhe por que não recomenda "${itemName}".`
              : `Compartilhe por que recomenda "${itemName}".`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium">
            {isNegative ? "Por que não recomenda?" : "Por que você recomenda?"}
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isNegative
                ? "Descreva os motivos..."
                : "Compartilhe sua experiência..."
            }
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitReview.isPending}
            variant={isNegative ? "destructive" : "default"}
          >
            {submitReview.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
