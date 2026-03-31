import { useState, useEffect } from "react";
import { MessageSquare, Building2, ThumbsUp, ThumbsDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAdvisorReviews, AdvisorItemType, AdvisorReview } from "@/hooks/useAdvisorReviews";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemType: AdvisorItemType;
  itemName: string;
  initialTab?: "recommend" | "not_recommend";
}

function ReviewList({
  reviews,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
}: {
  reviews: AdvisorReview[];
  currentUserId?: string;
  isAdmin: boolean;
  onEdit: (review: AdvisorReview) => void;
  onDelete: (review: AdvisorReview) => void;
}) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhuma avaliação nesta categoria.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {reviews.map((rev) => {
        const isOwner = currentUserId === rev.user_id;
        const canAct = isOwner || isAdmin;
        return (
          <div key={rev.id} className="rounded-lg border border-border/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
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
              {canAct && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && (
                      <DropdownMenuItem onClick={() => onEdit(rev)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(rev)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {rev.comment && (
              <p className="text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>
            )}
            <p className="text-xs text-muted-foreground/60">
              {new Date(rev.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ViewAdvisorReviewsDialog({ open, onOpenChange, itemId, itemType, itemName, initialTab = "recommend" }: Props) {
  const { recommendReviews, notRecommendReviews, isLoading, counts, submitReview, deleteReview } = useAdvisorReviews(itemId, itemType);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [tab, setTab] = useState(initialTab);

  const [deleteTarget, setDeleteTarget] = useState<AdvisorReview | null>(null);
  const [editTarget, setEditTarget] = useState<AdvisorReview | null>(null);
  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteReview.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleEditSave = () => {
    if (!editTarget || !editComment.trim()) return;
    submitReview.mutate(
      { review_type: editTarget.review_type, comment: editComment.trim() },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  return (
    <>
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
                <ReviewList
                  reviews={recommendReviews}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                  onEdit={(r) => { setEditTarget(r); setEditComment(r.comment || ""); }}
                  onDelete={setDeleteTarget}
                />
              </TabsContent>
              <TabsContent value="not_recommend" className="mt-4">
                <ReviewList
                  reviews={notRecommendReviews}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                  onEdit={(r) => { setEditTarget(r); setEditComment(r.comment || ""); }}
                  onDelete={setDeleteTarget}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar avaliação
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            rows={4}
            placeholder="Atualize seu comentário..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={submitReview.isPending}>
              {submitReview.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
