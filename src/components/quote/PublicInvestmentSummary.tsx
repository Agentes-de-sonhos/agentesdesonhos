import { useMemo } from "react";
import {
  Plane, Building2, Ship, MapPin, Shield, Car, Ticket, TrainFront,
  Sparkles, Wallet, CreditCard, Info, Users,
} from "lucide-react";
import type { Quote, QuoteService, ServiceType } from "@/types/quote";
import { SERVICE_TYPE_LABELS } from "@/types/quote";
import { extractServicePaymentConfig, extractFlightFeeInfo, calculateServicePayment } from "@/lib/servicePayment";
import { cn } from "@/lib/utils";

/** Formatação BRL única, igual ao restante do orçamento público. */
function fmt(value: number) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const SERVICE_ICON: Record<ServiceType, typeof Plane> = {
  flight: Plane,
  hotel: Building2,
  cruise: Ship,
  attraction: Ticket,
  insurance: Shield,
  transfer: Car,
  car_rental: Car,
  rail_transport: TrainFront,
  circuit: MapPin,
  other: Sparkles,
};

/**
 * Cor única: tudo herda a cor primária da agência (ou do sistema, quando
 * a agência não tem cor configurada). Os ícones se distinguem pela forma,
 * não pela cor.
 */
const TONE_PRIMARY = "bg-primary/10 text-primary";
const VALUE_PRIMARY = "text-primary";

/** Rótulo natural por tipo: "Total da Passagem Aérea", "Total do Cruzeiro" etc. */
const GROUP_TOTAL_LABEL: Record<ServiceType, string> = {
  flight: "Total da Passagem Aérea",
  hotel: "Total da Hospedagem",
  cruise: "Total do Cruzeiro",
  attraction: "Total dos Ingressos",
  insurance: "Total do Seguro",
  transfer: "Total do Transfer",
  car_rental: "Total da Locação",
  rail_transport: "Total do Transporte",
  circuit: "Total do Circuito",
  other: "Total dos Serviços",
};

export type InvestmentDisplayMode = "investment" | "detailed" | "both";
export type GroupingMode = "grouped" | "ungrouped";
export type GlobalPaymentMode = "installments" | "installments_with_entry" | "full_payment" | "total_only";

export interface PublicInvestmentSummaryProps {
  quote: Quote;
  services: QuoteService[];
  displayMode: InvestmentDisplayMode;       // "detailed" | "both" (não usado para "investment")
  groupingMode: GroupingMode;
  globalPayment: {
    mode: GlobalPaymentMode;
    installments: number;
    entryPercentage: number;
    fullPaymentDiscountPercent: number;
    methodLabel: string | null;
  };
  useServicePayment: boolean;
  paymentTerms: string | null;
}

interface PaymentInfo {
  /** chave de assinatura da condição (para agrupar serviços compatíveis). */
  signature: string;
  /** texto resumido — "10x de R$ 880,00" / "Entrada R$ … + 5x …" / "À vista" */
  render: (groupTotal: number) => Array<{ label: string; value: string }>;
}

/**
 * Calcula a forma de pagamento aplicada a um serviço.
 * - Se o orçamento usa pagamento por serviço E o serviço tem config própria → usa a condição do serviço.
 * - Caso contrário, usa a condição global do orçamento.
 * A renderização final usa o total do GRUPO para reescrever os valores
 * (Ex.: 10x de "groupTotal / 10"), mantendo a mesma fórmula atual.
 */
function buildPaymentInfo(
  service: QuoteService,
  global: PublicInvestmentSummaryProps["globalPayment"],
  useServicePayment: boolean,
): PaymentInfo {
  const cfg = extractServicePaymentConfig(service as any);
  if (useServicePayment && cfg.is_custom_payment && cfg.payment_type) {
    const feeInfo = extractFlightFeeInfo(service as any);
    // assinatura inclui todos os campos relevantes
    const sig = `svc:${cfg.payment_type}|${cfg.installments}|${cfg.entry_value}|${cfg.discount_type}|${cfg.discount_value}|${cfg.payment_method ?? ""}`;
    return {
      signature: sig,
      // Recalcula sobre o total do grupo para que serviços agrupados
      // (mesma assinatura de pagamento) somem corretamente os valores.
      render: (groupTotal: number) => {
        const r = calculateServicePayment(groupTotal, cfg, feeInfo);
        if (r.type === "installments") {
          if ("firstInstallmentValue" in r && r.firstInstallmentValue) {
            return [
              { label: "1ª parcela", value: fmt(r.firstInstallmentValue!) },
              { label: `+ ${r.installmentCount - 1}x de`, value: fmt(r.installmentValue) },
            ];
          }
          return [{ label: `${r.installmentCount}x de`, value: fmt(r.installmentValue) }];
        }
        if (r.type === "installments_with_entry") {
          return [
            { label: "Entrada", value: fmt(r.entryValue) },
            { label: `${r.installmentCount}x de`, value: fmt(r.installmentValue) },
          ];
        }
        return [{ label: "À vista", value: fmt(r.hasDiscount ? r.discountedTotal : r.total) }];
      },
    };
  }

  // Condição global — preserva a mesma fórmula do bloco legado.
  const g = global;
  const sig = `glb:${g.mode}|${g.installments}|${g.entryPercentage}|${g.fullPaymentDiscountPercent}|${g.methodLabel ?? ""}`;
  return {
    signature: sig,
    render: (groupTotal: number) => {
      if (g.mode === "installments") {
        const inst = groupTotal / (g.installments || 1);
        return [{ label: `${g.installments}x de`, value: fmt(inst) }];
      }
      if (g.mode === "installments_with_entry") {
        const entry = groupTotal * (g.entryPercentage / 100);
        const remainder = groupTotal - entry;
        const inst = remainder / (g.installments || 1);
        return [
          { label: "Entrada", value: fmt(entry) },
          { label: `${g.installments}x de`, value: fmt(inst) },
        ];
      }
      if (g.mode === "full_payment") {
        const value = groupTotal * (1 - (g.fullPaymentDiscountPercent || 0) / 100);
        return [{ label: g.fullPaymentDiscountPercent > 0 ? `À vista (-${g.fullPaymentDiscountPercent}%)` : "À vista", value: fmt(value) }];
      }
      // total_only — sem condição específica
      return [{ label: "Valor total", value: fmt(groupTotal) }];
    },
  };
}

interface GroupItem {
  key: string;
  type: ServiceType;
  title: string;          // "Hospedagem" (agrupado) ou nome do serviço (individual)
  subtitle?: string;      // "3 serviços" / fornecedor
  total: number;
  payment: PaymentInfo;
  count: number;
}

export function PublicInvestmentSummary({
  quote,
  services,
  displayMode,
  groupingMode,
  globalPayment,
  useServicePayment,
  paymentTerms,
}: PublicInvestmentSummaryProps) {
  const totalAll = useMemo(
    () => services.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [services],
  );

  const items: GroupItem[] = useMemo(() => {
    if (groupingMode === "ungrouped") {
      return services.map((s) => {
        const payment = buildPaymentInfo(s, globalPayment, useServicePayment);
        const sd: any = (s as any).service_data || {};
        const subtitle = sd.supplier || sd.airline || sd.hotel_name || sd.cruise_line || sd.operator || undefined;
        const serviceName = (s as any).service_name || s.option_label || sd.hotel_name || sd.airline || SERVICE_TYPE_LABELS[s.service_type];
        return {
          key: s.id,
          type: s.service_type,
          title: serviceName,
          subtitle: subtitle && subtitle !== serviceName ? subtitle : undefined,
          total: Number(s.amount) || 0,
          payment,
          count: 1,
        };
      });
    }
    // Agrupamento por tipo + assinatura de condição de pagamento
    const buckets = new Map<string, GroupItem>();
    for (const s of services) {
      const payment = buildPaymentInfo(s, globalPayment, useServicePayment);
      const key = `${s.service_type}__${payment.signature}`;
      const existing = buckets.get(key);
      const amount = Number(s.amount) || 0;
      if (existing) {
        existing.total += amount;
        existing.count += 1;
        existing.subtitle = `${existing.count} serviços`;
      } else {
        buckets.set(key, {
          key,
          type: s.service_type,
          title: SERVICE_TYPE_LABELS[s.service_type],
          subtitle: "1 serviço",
          total: amount,
          payment,
          count: 1,
        });
      }
    }
    return Array.from(buckets.values());
  }, [services, groupingMode, globalPayment, useServicePayment]);

  const showTotalCard = displayMode === "both";
  const discountPct = globalPayment.fullPaymentDiscountPercent || 0;
  const totalAVista = discountPct > 0 ? totalAll * (1 - discountPct / 100) : null;
  const totalLabel = groupingMode === "grouped"
    ? "Veja abaixo o investimento detalhado por tipo de serviço e as condições de pagamento da sua viagem."
    : "Veja abaixo o investimento detalhado por serviço e as condições de pagamento da sua viagem.";

  // Formatação da string de passageiros para contextualizar os valores
  const adults = Number(quote.adults_count) || 0;
  const children = Number(quote.children_count) || 0;
  const infants = Number((quote as any).infants_count) || 0;

  const hasAgeBreakdown = children > 0 || infants > 0;
  const totalPassengers = adults + children + infants;

  const passengerLabel = useMemo(() => {
    if (!hasAgeBreakdown) {
      return `${totalPassengers} passageiro${totalPassengers === 1 ? "" : "s"}`;
    }
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} adulto${adults === 1 ? "" : "s"}`);
    if (children > 0) parts.push(`${children} criança${children === 1 ? "" : "s"}`);
    if (infants > 0) parts.push(`${infants} bebê${infants === 1 ? "" : "s"}`);
    return parts.join(" • ");
  }, [adults, children, infants, hasAgeBreakdown, totalPassengers]);

  return (
    <section
      className="rounded-2xl border border-border/40 bg-white p-5 sm:p-7 shadow-sm animate-fade-up"
      aria-labelledby="condicoes-pagamento-title"
    >
      {/* Cabeçalho — mobile centralizado, desktop/tablet alinhado à esquerda (versão anterior) */}
      <div className="mb-6 text-center sm:mb-6 sm:text-left">
        <h3 id="condicoes-pagamento-title" className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Condições de Pagamento
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed sm:mt-1 sm:max-w-none sm:mx-0 sm:leading-normal">
          {totalLabel}
        </p>
      </div>

      {/* Cards de serviço — layout unificado conforme referência visual */}
      <ul className="space-y-4 list-none p-0">
        {items.map((item) => {
          const Icon = SERVICE_ICON[item.type] || Sparkles;
          const rows = item.payment.render(item.total);
          const totalLabelText =
            groupingMode === "grouped"
              ? (GROUP_TOTAL_LABEL[item.type] || "Total dos Serviços")
              : "Total do serviço";

          return (
            <li
              key={item.key}
              className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] hover:shadow-[0_4px_18px_-6px_rgba(15,23,42,0.12)] transition-shadow"
              aria-label={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ""}, ${totalLabelText} ${fmt(item.total)}`}
            >
              {/* Cabeçalho: ícone + título + pill de contagem (alinhado à esquerda) */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn("flex h-11 w-11 items-center justify-center rounded-full shrink-0", TONE_PRIMARY)}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <p className="text-base sm:text-lg font-bold text-foreground leading-tight">
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <span className="inline-flex items-center rounded-md border border-border/60 bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Informação complementar de passageiros */}
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
                <Users className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span>{passengerLabel}</span>
              </div>

              {/* Grid financeiro: Forma de pagamento | Total (divisor central) */}
              <div className="mt-5 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 sm:items-center text-center">
                <div className="sm:border-r sm:border-border/50 sm:pr-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Forma de pagamento
                  </p>
                  <div className="mt-2 space-y-1">
                    {rows.map((r, i) => (
                      <p key={i} className="leading-snug">
                        <span className="text-sm text-muted-foreground">{r.label}: </span>
                        <span className={cn("text-xl sm:text-2xl font-bold tracking-tight", VALUE_PRIMARY)}>
                          {r.value}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border/50 pt-4 sm:border-t-0 sm:pt-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {totalLabelText}
                  </p>
                  <p className={cn("mt-2 text-xl sm:text-2xl font-normal tracking-tight", VALUE_PRIMARY)}>
                    {fmt(item.total)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {showTotalCard && (
        <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/[0.05] p-6 sm:p-7">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm" aria-hidden="true">
              <Wallet className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Investimento Total da Viagem
            </p>
            <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {fmt(totalAll)}
            </p>
            {totalAVista !== null && (
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                À vista com {discountPct}% de desconto:{" "}
                <span className="font-semibold text-primary">{fmt(totalAVista)}</span>
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="rounded-xl bg-white border border-primary/20 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Total de serviços
              </p>
              <p className={cn("mt-1 text-sm font-semibold", VALUE_PRIMARY)}>
                {services.length} serviço{services.length === 1 ? "" : "s"}
              </p>
            </div>
            {groupingMode === "grouped" && (
              <div className="rounded-xl bg-white border border-primary/20 px-4 py-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Tipos de serviço
                </p>
                <p className={cn("mt-1 text-sm font-semibold", VALUE_PRIMARY)}>
                  {items.length} tipo{items.length === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {(globalPayment.methodLabel || paymentTerms) && (
        <div className="mt-4 rounded-lg border border-border/40 bg-muted/40 px-4 py-3 text-xs sm:text-sm text-foreground/80">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-primary/80 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              {globalPayment.methodLabel && (
                <p>
                  <span className="font-semibold text-foreground">Meio de pagamento:</span>{" "}
                  {globalPayment.methodLabel}
                </p>
              )}
              {paymentTerms && <p className="leading-relaxed">{paymentTerms}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PublicInvestmentSummary;