import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, X } from "lucide-react";
import { opportunityDeepLink, useAgencySiteRequestAlerts } from "@/hooks/useAgencySiteRequestAlerts";

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/**
 * Aviso destacado, em qualquer tela autenticada, de uma solicitação recebida
 * pelo site da agência — inclusive dentro da própria Gestão de Oportunidades.
 * Aparece uma única vez por solicitação.
 */
export function NewSiteRequestAlert() {
  const navigate = useNavigate();
  const { current, pending, dismiss } = useAgencySiteRequestAlerts();

  const open = () => {
    if (!current) return;
    const href = opportunityDeepLink(current.opportunity_id);
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
                <Globe className="h-6 w-6 text-primary" />
                Nova solicitação recebida pelo site
              </DialogTitle>
              <DialogDescription>
                {current.lead_name} enviou uma solicitação em {formatDateTime(current.created_at)}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1 rounded-lg border bg-muted/30 p-4 text-sm">
              {current.service_label && (
                <p>
                  <span className="text-muted-foreground">Serviço: </span>
                  <span className="font-medium">{current.service_label}</span>
                </p>
              )}
              {current.destination && (
                <p>
                  <span className="text-muted-foreground">Destino: </span>
                  <span className="font-medium">{current.destination}</span>
                </p>
              )}
            </div>

            {pending > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                +{pending} {pending === 1 ? "outra solicitação" : "outras solicitações"} aguardando
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={open} size="lg" data-testid="site-request-open">
                Abrir a oportunidade
                <ArrowRight className="ml-2 h-4 w-4" />
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
