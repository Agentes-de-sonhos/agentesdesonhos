import { useMemo } from "react";
import {
  Plane, Building2, Ship, MapPin, Shield, Car, Ticket, TrainFront,
  Sparkles, Wallet, CreditCard, Info,
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

/** Tons suaves por categoria — apenas decorativos. */
const SERVICE_TONE: Record<ServiceType, string> = {
  flight: "bg-sky-50 text-sky-600",
  hotel: "bg-violet-50 text-violet-600",
  cruise: "bg-emerald-50 text-emerald-600",
  attraction: "bg-amber-50 text-amber-600",
  insurance: "bg-rose-50 text-rose-600",
  transfer: "bg-indigo-50 text-indigo-600",
  car_rental: "bg-indigo-50 text-indigo-600",
  rail_transport: "bg-cyan-50 text-cyan-600",
  circuit: "bg-teal-50 text-teal-600",
  other: "bg-muted text-muted-foreground",
};

const VALUE_TONE: Record<ServiceType, string> = {
  flight: "text-sky-600",
  hotel: "text-violet-600",
  cruise: "text-emerald-600",
  attraction: "text-amber-600",
  insurance: "text-rose-600",
  transfer: "text-indigo-600",
  car_rental: "text-indigo-600",
  rail_transport: "text-cyan-600",
  circuit: "text-teal-600",
  other: "text-foreground",
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

  return (
    <section
      className="rounded-2xl border border-border/40 bg-white p-5 sm:p-7 shadow-sm animate-fade-up"
      aria-labelledby="condicoes-pagamento-title"
    >
      <div className="mb-5 sm:mb-6">
        <h3 id="condicoes-pagamento-title" className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Condições de Pagamento
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{totalLabel}</p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const Icon = SERVICE_ICON[item.type] || Sparkles;
          const tone = SERVICE_TONE[item.type] || SERVICE_TONE.other;
          const valueTone = VALUE_TONE[item.type] || VALUE_TONE.other;
          const rows = item.payment.render(item.total);
          const totalLabelText = groupingMode === "grouped" ? "Total do grupo" : "Total do serviço";

          return (
            <li
              key={item.key}
              className="rounded-xl border border-border/40 bg-card p-4 sm:p-5"
              aria-label={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ""}, ${totalLabelText} ${fmt(item.total)}`}
            >
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
                {/* Coluna 1: identidade */}
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn("flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full shrink-0", tone)}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground leading-tight truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Coluna 2: total */}
                <div className="sm:border-l sm:border-border/40 sm:pl-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {totalLabelText}
                  </p>
                  <p className={cn("mt-0.5 text-lg sm:text-xl font-bold tracking-tight", valueTone)}>
                    {fmt(item.total)}
                  </p>
                </div>

                {/* Coluna 3: forma de pagamento */}
                <div className="sm:border-l sm:border-border/40 sm:pl-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Forma de pagamento
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm text-foreground/90">
                    {rows.map((r, i) => (
                      <li key={i} className="flex items-baseline gap-1.5">
                        <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/60" aria-hidden="true" />
                        <span className="text-muted-foreground">{r.label}:</span>
                        <span className="font-medium text-foreground">{r.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {showTotalCard && (
        <div className="mt-5 sm:mt-6 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 sm:p-5">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0" aria-hidden="true">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-emerald-900/80">
                  Investimento Total da Viagem
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700">
                  {fmt(totalAll)}
                </p>
              </div>
            </div>

            {totalAVista !== null && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  À vista com {discountPct}% de desconto
                </p>
                <p className="mt-0.5 text-base sm:text-lg font-bold text-emerald-700">{fmt(totalAVista)}</p>
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Total de serviços
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {services.length} serviço{services.length === 1 ? "" : "s"}
              </p>
            </div>

            {groupingMode === "grouped" && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Total de grupos
                </p>
                <p className="mt-0.5 text-base font-semibold text-foreground">
                  {items.length} grupo{items.length === 1 ? "" : "s"}
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