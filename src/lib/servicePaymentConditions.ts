/**
 * Fonte ÚNICA de verdade da apresentação de "Condições de pagamento" por
 * serviço no orçamento público.
 *
 * Usada tanto pelo card expandido do serviço (ServiceInvestmentInline) quanto
 * pelo detalhe do serviço dentro do modal "Minha solicitação de reserva",
 * garantindo zero divergência de cálculo.
 *
 * Prioridade:
 * 1. Condição específica do serviço (is_custom_payment + payment_type);
 * 2. Condição global do orçamento aplicada ao valor daquele serviço;
 * 3. Nada (nenhum bloco renderizado).
 */
import { hidesIndividualAmounts } from "@/lib/quotePricing";
import { formatPaymentMethodsInline } from "@/lib/paymentMethods";
import {
  calculateServicePayment,
  extractFlightFeeInfo,
  extractServicePaymentConfig,
} from "@/lib/servicePayment";

export interface ServicePaymentRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

export interface ServicePaymentConditions {
  /** Valor individual do serviço (0 quando oculto/pacote). */
  amount: number;
  /** Valor fechado de pacote: nenhum valor/parcelamento individual é exibido. */
  packageMode: boolean;
  rows: ServicePaymentRow[];
  methodLabel: string | null;
  /** true quando existe algo a exibir (linhas ou forma de pagamento). */
  hasConditions: boolean;
}

export function buildServicePaymentConditions(
  service: any,
  quote: any,
  formatAmount: (value: number) => string,
): ServicePaymentConditions {
  const amount = Number(service?.amount) || 0;
  const empty = { rows: [] as ServicePaymentRow[], methodLabel: null, hasConditions: false };

  if (quote && hidesIndividualAmounts(quote)) {
    return { amount: 0, packageMode: true, ...empty };
  }
  if (amount <= 0) {
    return { amount: 0, packageMode: false, ...empty };
  }

  const fmt = formatAmount;
  const cfg = extractServicePaymentConfig(service);
  const useServicePayment = !!quote && (quote.use_service_payment || cfg.is_custom_payment);

  const rows: ServicePaymentRow[] = [];
  let methodLabel: string | null = null;

  if (useServicePayment && cfg.is_custom_payment && cfg.payment_type) {
    const feeInfo = extractFlightFeeInfo(service);
    const r = calculateServicePayment(amount, cfg, feeInfo);
    methodLabel = cfg.payment_method ?? null;
    if (r.type === "installments") {
      if ("firstInstallmentValue" in r && r.firstInstallmentValue) {
        rows.push({ label: "1ª parcela", value: fmt(r.firstInstallmentValue), emphasis: true });
        rows.push({
          label: `+ ${r.installmentCount - 1}x de`,
          value: fmt(r.installmentValue),
          emphasis: true,
        });
      } else {
        rows.push({ label: `${r.installmentCount}x de`, value: fmt(r.installmentValue), emphasis: true });
      }
    } else if (r.type === "installments_with_entry") {
      rows.push({ label: "Entrada", value: fmt(r.entryValue) });
      rows.push({ label: `${r.installmentCount}x de`, value: fmt(r.installmentValue), emphasis: true });
    } else {
      rows.push({
        label: r.hasDiscount ? "À vista (com desconto)" : "À vista",
        value: fmt(r.hasDiscount ? r.discountedTotal : r.total),
        emphasis: true,
      });
    }
  } else if (quote) {
    const mode = (quote.payment_display_mode as string) || "full_payment";
    const installments = Number(quote.installments_count) || 10;
    const entryPct = Number(quote.entry_percentage) || 0;
    const discountPct = Number(quote.full_payment_discount_percent) || 0;
    methodLabel = formatPaymentMethodsInline(quote.payment_method_label) || null;

    if (mode === "installments") {
      rows.push({ label: `${installments}x de`, value: fmt(amount / (installments || 1)), emphasis: true });
    } else if (mode === "installments_with_entry") {
      const entry = amount * (entryPct / 100);
      const rem = Math.max(0, amount - entry);
      rows.push({ label: "Entrada", value: fmt(entry) });
      rows.push({ label: `${installments}x de`, value: fmt(rem / (installments || 1)), emphasis: true });
    } else if (mode === "full_payment") {
      const v = amount * (1 - discountPct / 100);
      rows.push({
        label: discountPct > 0 ? `À vista (-${discountPct}%)` : "À vista",
        value: fmt(v),
        emphasis: true,
      });
    }
    // total_only → nenhuma linha além do total do serviço
  }

  return {
    amount,
    packageMode: false,
    rows,
    methodLabel,
    hasConditions: rows.length > 0 || !!methodLabel,
  };
}
