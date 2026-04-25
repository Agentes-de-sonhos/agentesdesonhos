import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, MapPin, ThumbsUp } from "lucide-react";
import { BENEFIT_CATEGORIES } from "@/types/benefits";
import type { Benefit } from "@/types/benefits";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichContentDisplay } from "@/components/operator/RichContentDisplay";

interface BenefitDetailDialogProps {
  benefit: Benefit | null;
  open: boolean;
  onClose: () => void;
  userConfirmationType: string | null;
  onConfirm: (type: "works" | "not_available") => void;
}

export function BenefitDetailDialog({
  benefit, open, onClose, userConfirmationType, onConfirm,
}: BenefitDetailDialogProps) {
  if (!benefit) return null;

  const categoryLabel = BENEFIT_CATEGORIES.find((c) => c.value === benefit.category)?.label || benefit.category;

  // Rich content: prefer how_to_claim (legacy field used as the editable rich content),
  // fall back to full_description for older records.
  const richContent = benefit.how_to_claim || benefit.full_description || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {benefit.company_logo_url ? (
                <img src={benefit.company_logo_url} alt={benefit.company_name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-contain bg-muted p-1 shrink-0" />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">{benefit.company_name}</p>
                <DialogTitle className="text-lg sm:text-xl text-left">{benefit.title}</DialogTitle>
              </div>
            </div>

            {/* Funciona button — top right */}
            <button
              onClick={() => onConfirm("works")}
              className={`shrink-0 flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border transition-colors ${
                userConfirmationType === "works"
                  ? "bg-green-100 border-green-300 text-green-700"
                  : "border-border hover:bg-muted"
              }`}
              aria-label="Marcar como funciona"
            >
              <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Funciona</span>
              <span>({benefit.confirmations_count})</span>
            </button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="space-y-5 py-4">
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

            {/* Rich content (free-form formatted text) */}
            {richContent && <RichContentDisplay content={richContent} />}

            {/* Requirements (kept as plain field) */}
            {benefit.requirements && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Requisitos</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{benefit.requirements}</p>
              </div>
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
