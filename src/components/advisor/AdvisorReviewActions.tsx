import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AdvisorItemType, useAdvisorReviewCounts, useMyAdvisorReview } from "@/hooks/useAdvisorReviews";
import { AdvisorReviewDialog } from "./AdvisorReviewDialog";
import { ViewAdvisorReviewsDialog } from "./ViewAdvisorReviewsDialog";

interface AdvisorReviewActionsProps {
  itemId: string;
  itemType: AdvisorItemType;
  itemName: string;
}

export function AdvisorReviewActions({ itemId, itemType, itemName }: AdvisorReviewActionsProps) {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDialogType, setReviewDialogType] = useState<"recommend" | "not_recommend">("recommend");
  const [viewReviewsOpen, setViewReviewsOpen] = useState(false);
  const [viewReviewsTab, setViewReviewsTab] = useState<"recommend" | "not_recommend">("recommend");

  const { data: counts } = useAdvisorReviewCounts(itemId, itemType);
  const { data: myReview } = useMyAdvisorReview(itemId, itemType);

  const totalReviews = (counts?.recommend || 0) + (counts?.not_recommend || 0);
  const alreadyRecommended = myReview?.review_type === "recommend";
  const alreadyNotRecommended = myReview?.review_type === "not_recommend";

  return (
    <>
      <div className="flex items-center gap-1.5">
        {totalReviews > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary"
            onClick={() => { setViewReviewsTab("recommend"); setViewReviewsOpen(true); }}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1 px-2 ${alreadyRecommended ? 'text-success bg-success/10' : 'text-success hover:text-success hover:bg-success/10'}`}
              onClick={() => {
                if (alreadyRecommended) { setViewReviewsTab("recommend"); setViewReviewsOpen(true); }
                else { setReviewDialogType("recommend"); setReviewDialogOpen(true); }
              }}
            >
              <ThumbsUp className="h-4 w-4" />
              {(counts?.recommend || 0) > 0 && (
                <span className="text-xs font-medium">({counts?.recommend})</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {alreadyRecommended ? "Você já recomendou" : "Recomendar"}
            {(counts?.recommend || 0) > 0 && ` (${counts?.recommend})`}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1 px-2 ${alreadyNotRecommended ? 'text-destructive bg-destructive/10' : 'text-destructive/60 hover:text-destructive hover:bg-destructive/10'}`}
              onClick={() => {
                if (alreadyNotRecommended) { setViewReviewsTab("not_recommend"); setViewReviewsOpen(true); }
                else { setReviewDialogType("not_recommend"); setReviewDialogOpen(true); }
              }}
            >
              <ThumbsDown className="h-4 w-4" />
              {(counts?.not_recommend || 0) > 0 && (
                <span className="text-xs font-medium">({counts?.not_recommend})</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {alreadyNotRecommended ? "Você já avaliou" : "Não recomendar"}
            {(counts?.not_recommend || 0) > 0 && ` (${counts?.not_recommend})`}
          </TooltipContent>
        </Tooltip>
      </div>

      <AdvisorReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        itemId={itemId}
        itemType={itemType}
        itemName={itemName}
        reviewType={reviewDialogType}
      />

      <ViewAdvisorReviewsDialog
        open={viewReviewsOpen}
        onOpenChange={setViewReviewsOpen}
        itemId={itemId}
        itemType={itemType}
        itemName={itemName}
        initialTab={viewReviewsTab}
      />
    </>
  );
}
