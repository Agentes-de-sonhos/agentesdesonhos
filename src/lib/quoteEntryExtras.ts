/**
 * Tipos e utilidades para "Valores adicionais na entrada" do orçamento.
 * Aplicáveis somente quando o orçamento está configurado como
 * `investment_summary_layout = 'consolidated'` e `payment_display_mode = 'installments_with_entry'`.
 *
 * Regras de cálculo (espelham a regra acordada com o produto):
 *  - extras_entrada = soma de adicionais (fixos + percentuais)
 *  - percentual usa SEMPRE total_servicos como base (evita cálculo circular)
 *  - investimento_total = total_servicos + extras_entrada
 *  - entrada_exibida = entrada_base + extras_entrada
 *  - saldo_parcelado = investimento_total - entrada_exibida = total_servicos - entrada_base
 *  - valor_parcela = saldo_parcelado / quantidade_parcelas
 */

export type QuoteEntryExtraType =
  | "rav"
  | "tax"
  | "fee"
  | "fii"
  | "admin_fee"
  | "other";

export type QuoteEntryExtraCalculationMode = "fixed" | "percent";

export interface QuoteEntryExtra {
  id: string;
  quote_id: string;
  type: QuoteEntryExtraType;
  description: string | null;
  calculation_mode: QuoteEntryExtraCalculationMode;
  /** Valor em R$ quando fixed; em % (ex.: 5 = 5%) quando percent */
  value: number;
  visible_to_client: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export const ENTRY_EXTRA_TYPE_LABELS: Record<QuoteEntryExtraType, string> = {
  rav: "RAV",
  tax: "Taxa",
  fee: "Fee",
  fii: "FII",
  admin_fee: "Taxa administrativa",
  other: "Outro",
};

/** Calcula o valor monetário de UM adicional, com base no total dos serviços. */
export function computeExtraAmount(extra: QuoteEntryExtra, totalServicos: number): number {
  const v = Number(extra.value) || 0;
  if (extra.calculation_mode === "percent") {
    // Percentual SEMPRE sobre total_servicos para evitar cálculo circular.
    return (totalServicos * v) / 100;
  }
  return v;
}

/** Soma de todos os adicionais (em R$). */
export function computeExtrasTotal(
  extras: QuoteEntryExtra[] | undefined | null,
  totalServicos: number,
): number {
  if (!extras || extras.length === 0) return 0;
  return extras.reduce((sum, e) => sum + computeExtraAmount(e, totalServicos), 0);
}