import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardCheck, Loader2, X } from "lucide-react";
import {
  bookingRequestDeepLink,
  fetchBookingRequestFile,
  useBookingRequestAlerts,
} from "@/hooks/useBookingRequestAlerts";

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/**
 * Aviso, em qualquer tela autenticada, de que o cliente confirmou os serviços
 * do orçamento — inclusive dentro da própria Central de Reservas. Aparece uma
 * única vez por pedido e abre a ficha correta.
 */
export function NewBookingRequestAlert() {
  const navigate = useNavigate();
  const { current, pending, dismiss } = useBookingRequestAlerts();
  const [opening, setOpening] = useState(false);

  const open = async () => {
    if (!current || opening) return;
    setOpening(true);
    const fileId = await fetchBookingRequestFile(current.id);
    const href = bookingRequestDeepLink(fileId, current.opportunity_id);
    setOpening(false);
    dismiss();
    navigate(href);
  };

  return (
    <Dialog open={!!current} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="sm:max-w-md">
        {current && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ClipboardCheck className="h-6 w-6 text-primary" />
                Cliente confirmou serviços do orçamento
              </DialogTitle>
              <DialogDescription>
                {current.client_name} confirmou a solicitação em {formatDateTime(current.created_at)}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1 rounded-lg border bg-muted/30 p-4 text-sm">
              {current.protocol && (
                <p>
                  <span className="text-muted-foreground">Protocolo: </span>
                  <span className="font-medium">{current.protocol}</span>
                </p>
              )}
              {current.destination && (
                <p>
                  <span className="text-muted-foreground">Destino: </span>
                  <span className="font-medium">{current.destination}</span>
                </p>
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                Ainda não é uma reserva confirmada: reconfirme serviços, disponibilidade e valores.
              </p>
            </div>

            {pending > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                +{pending} {pending === 1 ? "outra solicitação" : "outras solicitações"} aguardando
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={open} size="lg" disabled={opening} data-testid="booking-request-open">
                {opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Abrir a solicitação
                {!opening && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <Button onClick={dismiss} variant="ghost">
                <X className="mr-2 h-4 w-4" />
                Fechar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
