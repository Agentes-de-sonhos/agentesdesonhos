import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, MapPin, ExternalLink, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { BENEFIT_CATEGORIES } from "@/types/benefits";
import type { Benefit, BenefitComment } from "@/types/benefits";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BenefitDetailDialogProps {
  benefit: Benefit | null;
  open: boolean;
  onClose: () => void;
  comments: BenefitComment[];
  isLoadingComments: boolean;
  onAddComment: (content: string) => void;
  isAddingComment: boolean;
  userConfirmationType: string | null;
  onConfirm: (type: "works" | "not_available") => void;
}

export function BenefitDetailDialog({
  benefit, open, onClose, comments, isLoadingComments,
  onAddComment, isAddingComment, userConfirmationType, onConfirm,
}: BenefitDetailDialogProps) {
  const [comment, setComment] = useState("");

  if (!benefit) return null;

  const categoryLabel = BENEFIT_CATEGORIES.find((c) => c.value === benefit.category)?.label || benefit.category;

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    onAddComment(comment.trim());
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {benefit.company_logo_url ? (
              <img src={benefit.company_logo_url} alt={benefit.company_name} className="h-24 w-24 rounded-lg object-contain bg-muted p-1" />
            ) : (
              <div className="h-24 w-24 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{benefit.company_name}</p>
              <DialogTitle className="text-xl">{benefit.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge>{categoryLabel}</Badge>
              {benefit.destination && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {benefit.destination}
                </Badge>
              )}
              {benefit.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>

            {/* Confirmations */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onConfirm("works")}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-colors ${
                  userConfirmationType === "works"
                    ? "bg-green-100 border-green-300 text-green-700"
                    : "border-border hover:bg-muted"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                Funciona ({benefit.confirmations_count})
              </button>
              <button
                onClick={() => onConfirm("not_available")}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-colors ${
                  userConfirmationType === "not_available"
                    ? "bg-red-100 border-red-300 text-red-700"
                    : "border-border hover:bg-muted"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                Indisponível ({benefit.not_available_count})
              </button>
            </div>

            {/* Description */}
            {benefit.full_description && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Descrição</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{benefit.full_description}</p>
              </div>
            )}

            {/* Requirements */}
            {benefit.requirements && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Requisitos</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{benefit.requirements}</p>
              </div>
            )}

            {/* How to claim */}
            {benefit.how_to_claim && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Como solicitar</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{benefit.how_to_claim}</p>
              </div>
            )}

            {/* Official link */}
            {benefit.official_link && (
              <Button variant="outline" asChild>
                <a href={benefit.official_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Link oficial
                </a>
              </Button>
            )}

            {/* Author */}
            {benefit.profile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={benefit.profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{benefit.profile.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>Compartilhado por <strong className="text-foreground">{benefit.profile.name}</strong></span>
                <span>· {format(new Date(benefit.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
              </div>
            )}

            {/* Comments */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-semibold text-sm">Comentários da comunidade</h4>
              {comments.length === 0 && !isLoadingComments && (
                <p className="text-sm text-muted-foreground">Nenhum comentário ainda. Seja o primeiro!</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarImage src={c.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{c.profile?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.profile?.name || "Usuário"}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                    </div>
                    <p className="text-sm mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="min-h-[60px] text-sm"
                />
                <Button size="icon" onClick={handleSubmitComment} disabled={!comment.trim() || isAddingComment} className="shrink-0 self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
