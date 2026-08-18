import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame, Loader2, ClipboardList, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatQuoteCurrency } from "@/lib/quoteCurrency";
import {
  BOOKING_ITEMS_SELECT,
  SELECTION_MODE_LABEL,
  bookingItemAmount,
  bookingItemLabel,
  type BookingRequestItemRow,
} from "@/lib/bookingRequestItems";

/**
 * Solicitações de reserva recebidas pelo orçamento público (White Label Premium).
 *
 * Só apresentação + "iniciar atendimento": a reserva, a cobrança e a emissão
 * continuam fora do Agentes de Sonhos. Leitura protegida por RLS da agência.
 */
interface Props {
  opportunityId: string;
}

const STATUS_LABEL: Record<string, string> = {
  received: "Aguardando reconfirmação",
  under_review: "Em atendimento",
  responded: "Respondido",
  approved: "Aprovado pelo cliente",
  rejected: "Recusado",
  cancelled: "Cancelado",
  superseded: "Substituído por nova versão",
  converted: "Convertido",
};

export function OpportunityBookingRequests({ opportunityId }: Props) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["opportunity-booking-requests", opportunityId],
    enabled: !!opportunityId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_booking_requests")
        .select(
          "id, protocol, version, status, client_name, client_email, client_whatsapp, client_notes, total_estimated, currency, created_at, quote_id, quote_booking_request_items(id, service_type, service_name, amount_snapshot, selection_mode_snapshot, quantity)",
        )
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const startReview = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc("booking_request_start_review" as any, {
        p_request_id: requestId,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(String((data as any).error));
      return data;
    },
    onSuccess: () => {
      toast.success("Atendimento iniciado. Registro salvo no histórico da solicitação.");
      queryClient.invalidateQueries({ queryKey: ["opportunity-booking-requests", opportunityId] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível registrar o atendimento."),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando solicitações…
      </div>
    );
  }
  if (!requests || requests.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        Nenhuma solicitação de reserva recebida pelo orçamento web.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req: any) => {
        const items = (req.quote_booking_request_items || []) as BookingRequestItemRow[];
        const isNew = req.status === "received";
        const contact = [req.client_whatsapp, req.client_email].filter(Boolean).join(" · ");
        return (
          <Collapsible
            key={req.id}
            open={openId === req.id}
            onOpenChange={(o) => setOpenId(o ? req.id : null)}
            className={`rounded-xl border ${isNew ? "border-amber-300 bg-amber-50/50 dark:bg-amber-500/5" : "border-border bg-background"}`}
          >
            <CollapsibleTrigger className="w-full px-3 py-2.5 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold">{req.protocol}</span>
                <Badge variant="secondary" className="text-[10px]">v{req.version}</Badge>
                <Badge variant={isNew ? "default" : "outline"} className="text-[10px]">
                  {STATUS_LABEL[req.status] || req.status}
                </Badge>
                {isNew && (
                  <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500 text-[10px]">
                    <Flame className="h-3 w-3" /> Alta intenção
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {req.created_at
                    ? format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : ""}
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 border-t border-border/60 px-3 py-3">
              <div className="grid gap-1 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Cliente: </span>{req.client_name}</p>
                <p><span className="text-muted-foreground">Contato: </span>{contact || "—"}</p>
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Valor apresentado: </span>
                  {formatQuoteCurrency(Number(req.total_estimated) || 0, req.currency || "BRL")}
                </p>
                {req.client_notes && (
                  <p className="sm:col-span-2 whitespace-pre-wrap">
                    <span className="text-muted-foreground">Observações: </span>
                    {req.client_notes}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Serviços selecionados ({items.length})
                </p>
                <ul className="space-y-1 text-sm">
                  {items.map((it) => {
                    const label = bookingItemLabel(it);
                    const amount = bookingItemAmount(it);
                    return (
                      <li key={it.id} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 flex-1">
                          {label}
                          {SELECTION_MODE_LABEL[it.selection_mode_snapshot || ""] && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({SELECTION_MODE_LABEL[it.selection_mode_snapshot || ""]})
                            </span>
                          )}
                        </span>
                        {amount > 0 && (
                          <span className="shrink-0 font-medium">
                            {formatQuoteCurrency(amount, req.currency || "BRL")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {isNew && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={startReview.isPending}
                  onClick={() => startReview.mutate(req.id)}
                >
                  {startReview.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Play className="h-3.5 w-3.5" />}
                  Registrar início do atendimento
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">
                Solicitação enviada pelo cliente. Reconfirme serviços, disponibilidade e valores nos
                sistemas da operadora — nada foi reservado ou cobrado aqui.
              </p>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
