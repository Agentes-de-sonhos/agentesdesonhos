import { hidesIndividualAmounts } from "@/lib/quotePricing";

/**
 * Novo visual do orçamento público — somente prévia.
 * Ativado apenas pelo parâmetro de URL `?visual=novo`. Sem o parâmetro,
 * todos os orçamentos (antigos e novos) continuam exatamente como hoje.
 */
export function isModernQuotePreview(search: string | null | undefined): boolean {
  if (!search) return false;
  try {
    return new URLSearchParams(search).get("visual") === "novo";
  } catch {
    return false;
  }
}

export type ModernSidebarKind = "price" | "price_detailed" | "summary";

export interface ModernSidebarModel {
  kind: ModernSidebarKind;
  total: number;
  /** Valor em destaque (parcela ou total). */
  headline: { label: string; value: number; installments?: number; entry?: number } | null;
  cashTotal: number | null;
  perPerson: number | null;
  travelers: number;
  /** Texto auxiliar para os modos detalhado/agrupado. */
  note: string | null;
}

/**
 * Decide o que o card lateral mostra, respeitando as 3 modalidades:
 * - consolidado / pacote: preço com parcelamento global;
 * - detalhado por serviço / agrupado: total + aviso de condições por item;
 * - total oculto ou investimento desligado: só resumo da viagem (sem valores).
 */
export function resolveModernSidebar(quote: any, total: number): ModernSidebarModel {
  const layout = quote?.investment_summary_layout || "legacy";
  const travelers =
    (Number(quote?.adults_count) || 0) +
    (Number(quote?.children_count) || 0) +
    (Number(quote?.infants_count) || 0);
  const base: ModernSidebarModel = {
    kind: "summary", total, headline: null, cashTotal: null, perPerson: null, travelers, note: null,
  };

  if (quote?.show_investment_section === false || !(total > 0)) return base;
  const perPerson = travelers > 0 ? total / travelers : null;

  const detailedLayout = (layout === "grouped" || layout === "ungrouped") && !hidesIndividualAmounts(quote);
  if (detailedLayout) {
    if (quote?.hide_investment_total === true) return base;
    return {
      ...base,
      kind: "price_detailed",
      headline: { label: "Investimento total", value: total },
      perPerson,
      note: layout === "grouped"
        ? "Condições de pagamento detalhadas por tipo de serviço."
        : "Condições de pagamento detalhadas em cada serviço.",
    };
  }

  const mode = quote?.payment_display_mode || "full_payment";
  const installments = Number(quote?.installments_count) || 10;
  const entryPct = Number(quote?.entry_percentage) || 0;
  const discountPct = Number(quote?.full_payment_discount_percent) || 0;
  const cash = mode === "full_payment" && discountPct > 0 ? total * (1 - discountPct / 100) : total;

  let headline: ModernSidebarModel["headline"];
  if (mode === "installments") {
    headline = { label: "Em até", value: total / installments, installments };
  } else if (mode === "installments_with_entry") {
    const entry = total * (entryPct / 100);
    headline = { label: "Entrada +", value: Math.max(0, total - entry) / installments, installments, entry };
  } else {
    headline = { label: "Investimento total", value: cash };
  }
  return { ...base, kind: "price", headline, cashTotal: cash, perPerson: travelers > 0 ? cash / travelers : null };
}
