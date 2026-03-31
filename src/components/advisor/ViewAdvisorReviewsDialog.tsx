import { useState, useEffect } from "react";
import { MessageSquare, User, Building2, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAdvisorReviews, AdvisorItemType, AdvisorReview } from "@/hooks/useAdvisorReviews";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemType: AdvisorItemType;
  itemName: string;
  initialTab?: "recommend" | "not_recommend";
}

function ReviewList({ reviews }: { reviews: AdvisorReview[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhuma avaliação nesta categoria.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {reviews.map((rev) => (
        <div key={rev.id} className="rounded-lg border border-border/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{rev.profile?.name || "Agente"}</span>
            {rev.profile?.agency_name && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{rev.profile.agency_name}</span>
                </div>
              </>
            )}
          </div>
          {rev.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>
          )}
          <p className="text-xs text-muted-foreground/60">
            {new Date(rev.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ViewAdvisorReviewsDialog({ open, onOpenChange, itemId, itemType, itemName, initialTab = "recommend" }: Props) {
  const { recommendReviews, notRecommendReviews, isLoading, counts } = useAdvisorReviews(itemId, itemType);
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Avaliações – {itemName}
          </DialogTitle>
          <DialogDescription>
            Veja o que outros agentes dizem sobre este item.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recommend" className="gap-1.5">
                <ThumbsUp className="h-3.5 w-3.5" />
                Recomendações ({counts.recommend})
              </TabsTrigger>
              <TabsTrigger value="not_recommend" className="gap-1.5">
                <ThumbsDown className="h-3.5 w-3.5" />
                Não recomendados ({counts.not_recommend})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="recommend" className="mt-4">
              <ReviewList reviews={recommendReviews} />
            </TabsContent>
            <TabsContent value="not_recommend" className="mt-4">
              <ReviewList reviews={notRecommendReviews} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
