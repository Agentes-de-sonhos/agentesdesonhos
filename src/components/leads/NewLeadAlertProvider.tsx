import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Eye, X, Phone, MapPin, Clock, PartyPopper } from "lucide-react";
import { useLeadRealtime, useMarkLeadAttended, type LeadItem } from "@/hooks/useLeadAlerts";

function sourceBadge(source: LeadItem["source"]) {
  if (source === "conversational") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
        🟢 Formulário Conversacional
      </Badge>
    );
  }
  return (
    <Badge className="bg-pink-100 text-pink-700 border border-pink-200 hover:bg-pink-100">
      🩷 Página de Vendas Personalizada
    </Badge>
  );
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}

export function NewLeadAlertProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<LeadItem[]>([]);
  const markAttended = useMarkLeadAttended();

  const enqueue = useCallback((lead: LeadItem) => {
    setQueue((q) => (q.find((l) => l.id === lead.id) ? q : [...q, lead]));
    // Play a soft chime if available
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
      );
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  useLeadRealtime(enqueue);

  const current = queue[0];
  const extraCount = Math.max(queue.length - 1, 0);

  const close = () => setQueue((q) => q.slice(1));

  const openWhatsApp = () => {
    if (!current) return;
    const phone = normalizePhone(current.lead_phone);
    const message =
      current.whatsapp_message ??
      `Olá ${current.lead_name}! Sou consultor de viagens e recebi seu contato. Posso te ajudar a planejar sua próxima experiência?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    markAttended.mutate({ id: current.id, source: current.source });
    close();
  };

  const viewLead = () => {
    close();
    navigate("/meus-leads");
  };

  return (
    <>
      {children}
      <Dialog open={!!current} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <PartyPopper className="h-6 w-6 text-primary" />
                  Novo Lead Recebido
                </DialogTitle>
                <DialogDescription>
                  Uma nova oportunidade de negócio acabou de chegar. Entre em contato o quanto antes para aumentar suas chances de conversão.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Nome</p>
                    <p className="font-semibold text-base">{current.lead_name}</p>
                  </div>
                  {sourceBadge(current.source)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{current.lead_phone}</p>
                    </div>
                  </div>
                  {current.destination && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Destino de interesse</p>
                        <p className="font-medium">{current.destination}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Recebido em</p>
                      <p className="font-medium">{formatDateTime(current.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {extraCount > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{extraCount} {extraCount === 1 ? "outro lead" : "outros leads"} aguardando visualização
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={openWhatsApp} className="w-full" size="lg">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Entrar em contato
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={viewLead} variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar Lead
                  </Button>
                  <Button onClick={close} variant="ghost">
                    <X className="h-4 w-4 mr-2" />
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}