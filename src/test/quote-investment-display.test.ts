import { describe, it, expect } from "vitest";
import {
  usesPerServicePaymentBlocks,
  shouldRenderGlobalPaymentBlock,
} from "@/lib/quoteInvestmentDisplay";

describe("apresentação do investimento — bloco geral de condições de pagamento", () => {
  it("modo por serviço (preços detalhados): não renderiza o bloco geral", () => {
    const quote = { investment_summary_layout: "ungrouped", show_detailed_prices: true };
    expect(usesPerServicePaymentBlocks(quote)).toBe(true);
    expect(shouldRenderGlobalPaymentBlock(quote, 3)).toBe(false);
  });

  it("modo investimento total (agrupado): mantém o bloco geral", () => {
    const quote = { investment_summary_layout: "grouped", show_detailed_prices: true };
    expect(usesPerServicePaymentBlocks(quote)).toBe(false);
    expect(shouldRenderGlobalPaymentBlock(quote, 3)).toBe(true);
  });

  it("valor fechado de pacote: mantém o bloco geral mesmo em layout ungrouped", () => {
    const quote = {
      investment_summary_layout: "ungrouped",
      show_detailed_prices: true,
      pricing_mode: "package_total",
    };
    expect(usesPerServicePaymentBlocks(quote)).toBe(false);
    expect(shouldRenderGlobalPaymentBlock(quote, 2)).toBe(true);
  });

  it("ungrouped sem preços detalhados: mantém o bloco geral", () => {
    const quote = { investment_summary_layout: "ungrouped", show_detailed_prices: false };
    expect(usesPerServicePaymentBlocks(quote)).toBe(false);
    expect(shouldRenderGlobalPaymentBlock(quote, 2)).toBe(true);
  });

  it("layout legacy: bloco novo não se aplica", () => {
    const quote = { investment_summary_layout: "legacy", show_detailed_prices: true };
    expect(shouldRenderGlobalPaymentBlock(quote, 2)).toBe(false);
  });
});
