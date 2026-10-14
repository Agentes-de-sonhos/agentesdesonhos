import { isInMonth } from "@/utils/monthFilter";

/**
 * Entradas e Comissões nascem dos serviços (sale_products) com comissão > 0.
 * Uma venda sem serviços ou só com comissão zero não gera nada — nunca
 * derivamos comissão do valor bruto da venda.
 */
export type SaleFinancialGap = "no_products" | "zero_commission" | null;

export function saleFinancialGap(productCount: number, totalCommission: number): SaleFinancialGap {
  if (productCount === 0) return "no_products";
  if (!(totalCommission > 0)) return "zero_commission";
  return null;
}

export const SALE_GAP_MESSAGE: Record<Exclude<SaleFinancialGap, null>, string> = {
  no_products: "Sem serviços: adicione um produto com comissão para gerar Entrada e Comissão.",
  zero_commission: "Comissão zerada: informe a comissão do produto para gerar a Entrada.",
};

/**
 * Comissão pertence ao mês exibido pela data prevista ou de recebimento;
 * sem nenhuma das duas, usa a data da venda para não ficar invisível.
 */
export function commissionInMonth(
  c: { expected_date?: string | null; received_date?: string | null; sale_date?: string | null },
  month: number,
  year: number,
): boolean {
  if (!c.expected_date && !c.received_date) return isInMonth(c.sale_date, month, year);
  return isInMonth(c.expected_date, month, year) || isInMonth(c.received_date, month, year);
}
