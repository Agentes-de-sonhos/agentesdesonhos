import { useState } from "react";
import { ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitRecommendation } from "@/hooks/useHotelRecommendations";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotelId: string;
  hotelName: string;
  type: "recommend" | "remove";
}

export function RecommendHotelDialog({ open, onOpenChange, hotelId, hotelName, type }: Props) {
  const [reason, setReason] = useState("");
  const submit = useSubmitRecommendation();

  const isRemove = type === "remove";
  const Icon = isRemove ? AlertTriangle : ThumbsUp;

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Por favor, informe o motivo.");
      return;
    }
    submit.mutate(
      { hotelId, type, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(
            isRemove
              ? "Solicitação de remoção enviada para aprovação do administrador."
              : "Recomendação enviada para aprovação do administrador."
          );
          setReason("");
          onOpenChange(false);
        },
        onError: () => toast.error("Erro ao enviar. Tente novamente."),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${isRemove ? "text-destructive" : "text-primary"}`} />
            {isRemove ? "Sugerir remoção" : "Recomendar hotel"}
          </DialogTitle>
          <DialogDescription>
            {isRemove
              ? `Você está sugerindo a remoção de "${hotelName}". Sua solicitação será analisada pelo administrador.`
              : `Você está recomendando "${hotelName}". Sua recomendação será analisada pelo administrador antes de ser publicada.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium">
            {isRemove ? "Por que este hotel deve ser removido?" : "Por que você recomenda este hotel?"}
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isRemove
                ? "Descreva os motivos para a remoção..."
                : "Compartilhe sua experiência e motivos para recomendar..."
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
            disabled={submit.isPending}
            variant={isRemove ? "destructive" : "default"}
          >
            {submit.isPending ? "Enviando..." : isRemove ? "Enviar solicitação" : "Recomendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
