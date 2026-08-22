import { hidesIndividualAmounts } from "@/lib/quotePricing";

export type InvestmentSummaryLayout =
  | "legacy"
  | "consolidated"
  | "grouped"
  | "ungrouped";

/** Layout de apresentação do investimento configurado no orçamento. */
export function resolveInvestmentLayout(quote: any): InvestmentSummaryLayout {
  return (quote?.investment_summary_layout as InvestmentSummaryLayout | null) || "legacy";
}

/** Preços detalhados por serviço estão habilitados (e não é valor fechado de pacote). */
export function usesDetailedPrices(quote: any): boolean {
  return quote?.show_detailed_prices !== false && !hidesIndividualAmounts(quote);
}

/**
 * Modo "por serviço": cada card exibe parcelas, valor e forma de pagamento na
 * faixa azul-clara, portanto o bloco geral "Condições de Pagamento" não deve
 * ser renderizado. Nos modos investimento total / valor fechado de pacote o
 * bloco geral permanece.
 */
export function usesPerServicePaymentBlocks(quote: any): boolean {
  return resolveInvestmentLayout(quote) === "ungrouped" && usesDetailedPrices(quote);
}

/** Deve renderizar o bloco geral de Condições de Pagamento? */
export function shouldRenderGlobalPaymentBlock(quote: any, servicesCount: number): boolean {
  const layout = resolveInvestmentLayout(quote);
  const usesNewLayout = (layout === "grouped" || layout === "ungrouped") && servicesCount > 0;
  return usesNewLayout && !usesPerServicePaymentBlocks(quote);
}
