import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CreditCard, Pencil, Share2, Trash2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import type { BusinessCard } from "@/hooks/useBusinessCard";
import { getCardShareUrl } from "@/lib/cardShareUrl";

interface Props {
  card: BusinessCard;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function BusinessCardListItem({ card, onDelete, isDeleting }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const shareUrl = getCardShareUrl(card.slug);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: card.label || card.name,
          text: `Confira meu cartão: ${card.name}`,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  };

  const pc = card.primary_color || "#0284c7";
  const sc = card.secondary_color || "#f97316";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {/* Mini visual preview */}
      <div
        className="h-20 relative"
        style={{
          background: card.cover_url
            ? `url(${card.cover_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${pc}, ${sc})`,
        }}
      >
        <div className="absolute -bottom-6 left-4">
          {card.photo_url ? (
            <img
              src={card.photo_url}
              alt={card.name}
              className="h-12 w-12 rounded-full border-2 border-card object-cover shadow-md"
            />
          ) : (
            <div className="h-12 w-12 rounded-full border-2 border-card bg-muted flex items-center justify-center shadow-md">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <CardContent className="pt-9 pb-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base text-foreground line-clamp-1">
              {card.label || "Cartão sem etiqueta"}
            </h3>
            {!card.is_active && (
              <Badge variant="secondary" className="text-xs">Inativo</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {card.name || "Sem nome"}
            {card.title ? ` • ${card.title}` : ""}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">contato.tur.br/{card.slug}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default" className="flex-1 min-w-[100px]">
            <Link to={`/meu-cartao/${card.id}`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={share} className="flex-1 min-w-[100px]">
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Compartilhar
          </Button>
          <Button size="sm" variant="outline" onClick={copyLink} aria-label="Copiar link">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting}
            aria-label="Excluir cartão"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O link público <strong>contato.tur.br/{card.slug}</strong>{" "}
              deixará de funcionar imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(card.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
