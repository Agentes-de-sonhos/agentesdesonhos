import { isInMonth } from "@/utils/monthFilter";

/**
 * Comissões lista os serviços (sale_products) da venda, inclusive os de
 * comissão zero. A Entrada automática só nasce de serviço com comissão > 0.
 * Venda sem serviços não aparece em nenhuma das duas abas. Nunca derivamos
 * comissão do valor bruto, e comissão zero pode ser legítima.
 */
export type SaleFinancialGap = "no_products" | "zero_commission" | null;

export function saleFinancialGap(productCount: number, totalCommission: number): SaleFinancialGap {
  if (productCount === 0) return "no_products";
  if (!(totalCommission > 0)) return "zero_commission";
  return null;
}

export const SALE_GAP_MESSAGE: Record<Exclude<SaleFinancialGap, null>, string> = {
  no_products: "Venda sem serviços cadastrados: ela não aparece em Entradas nem em Comissões.",
  zero_commission: "Comissão total zero: os serviços aparecem em Comissões, mas não geram Entrada automática.",
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
