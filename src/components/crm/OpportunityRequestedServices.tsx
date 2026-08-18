import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, ClipboardList, Circle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatQuoteCurrency, type QuoteCurrency } from "@/lib/quoteCurrency";
import { BOOKING_ITEMS_SELECT, SELECTION_MODE_LABEL } from "@/lib/bookingRequestItems";
import {
  buildRequestedServicesView,
  pickActiveBookingRequest,
  type RequestedServiceView,
} from "@/lib/bookingRequestCrmView";

/**
 * Bloco "Serviços solicitados pelo cliente" dentro de Editar oportunidade.
 *
 * Selecionados: snapshot imutável de quote_booking_request_items.
 * Não selecionados: quote_services (contexto do que foi oferecido).
 * Nada aqui reserva, cobra ou confirma qualquer serviço.
 */
interface Props {
  opportunityId?: string;
  /** Rola e destaca o bloco quando aberto pela ação "Visualizar serviços solicitados". */
  autoFocus?: boolean;
}

function ServiceRow({ service, currency }: { service: RequestedServiceView; currency: QuoteCurrency }) {
  return (
    <li
      className={`rounded-lg border p-2.5 ${
        service.selected
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
          : "border-border bg-muted/20"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        {service.selected ? (
          <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> Selecionado pelo cliente
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
            <Circle className="h-3 w-3" /> Não selecionado
          </Badge>
        )}
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{service.label}</span>
        {service.amount > 0 && (
          <span className="text-sm font-semibold">
            {formatQuoteCurrency(service.amount, currency)}
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>{service.serviceType}</span>
        {service.quantity > 1 && <span>Qtd.: {service.quantity}</span>}
        {SELECTION_MODE_LABEL[service.selectionMode || ""] && (
          <span>Modo: {SELECTION_MODE_LABEL[service.selectionMode || ""]}</span>
        )}
        {service.details.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </li>
  );
}

export function OpportunityRequestedServices({ opportunityId, autoFocus }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["opportunity-requested-services", opportunityId],
    enabled: !!opportunityId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("quote_booking_requests")
        .select(
          `id, protocol, version, status, created_at, currency, total_estimated, quote_id, quote_booking_request_items(${BOOKING_ITEMS_SELECT}, snapshot, source_quote_service_id)`,
        )
        .eq("opportunity_id", opportunityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const active = pickActiveBookingRequest((requests ?? []) as any[]);
      if (!active) return null;

      const { data: services } = await supabase
        .from("quote_services")
        .select("id, service_type, option_label, amount, selection_mode, service_data")
        .eq("quote_id", (active as any).quote_id)
        .order("order_index", { ascending: true });

      return {
        request: active as any,
        view: buildRequestedServicesView({
          items: ((active as any).quote_booking_request_items || []) as any[],
          quoteServices: (services ?? []) as any[],
        }),
      };
    },
  });

  if (!opportunityId) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando serviços solicitados…
      </div>
    );
  }
  if (!data) return null;

  const { request, view } = data;
  const currency = ((request.currency as QuoteCurrency) || "BRL") as QuoteCurrency;

  return (
    <section
      id="booking-request"
      data-focus-section="booking-request"
      className={`scroll-mt-4 space-y-3 rounded-xl border-2 p-3 ${
        autoFocus ? "border-primary bg-primary/5" : "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wide">
          Serviços solicitados pelo cliente
        </h3>
        <Badge variant="secondary" className="text-[10px]">{request.protocol}</Badge>
        <Badge variant="outline" className="text-[10px]">v{request.version}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {request.created_at
            ? format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
            : ""}
        </span>
      </div>

      <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Solicitação enviada pelo cliente — é necessário reconfirmar disponibilidade e valores
          antes de qualquer confirmação. Nada foi reservado, emitido ou cobrado.
        </span>
      </p>

      <ul className="space-y-1.5">
        {view.selected.map((s) => (
          <ServiceRow key={s.key} service={s} currency={currency} />
        ))}
      </ul>

      <div className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Total selecionado ({view.selected.length})
        </span>
        <span className="text-base font-bold">
          {formatQuoteCurrency(
            view.selectedTotal || Number(request.total_estimated) || 0,
            currency,
          )}
        </span>
      </div>

      {view.unselected.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Demais serviços do orçamento ({view.unselected.length})
          </p>
          <ul className="space-y-1.5">
            {view.unselected.map((s) => (
              <ServiceRow key={s.key} service={s} currency={currency} />
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Orçamento de origem: <span className="font-mono">{request.quote_id}</span>
      </p>
    </section>
  );
}