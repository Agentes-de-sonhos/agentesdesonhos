import { describe, it, expect } from "vitest";
import { isModernQuotePreview, resolveModernSidebar } from "@/lib/quoteModernPreview";

describe("novo visual do orçamento (prévia)", () => {
  it("só liga com ?visual=novo", () => {
    expect(isModernQuotePreview("")).toBe(false);
    expect(isModernQuotePreview("?visual=antigo")).toBe(false);
    expect(isModernQuotePreview("?visual=novo")).toBe(true);
  });
  it("valor total: parcela global e valor por pessoa", () => {
    const m = resolveModernSidebar({ investment_summary_layout: "consolidated", payment_display_mode: "installments", installments_count: 10, adults_count: 25 }, 87690);
    expect(m.kind).toBe("price");
    expect(m.headline?.value).toBe(8769);
    expect(m.perPerson).toBeCloseTo(3507.6);
  });
  it("detalhado por serviço com total oculto não mostra valores", () => {
    const m = resolveModernSidebar({ investment_summary_layout: "ungrouped", hide_investment_total: true }, 87690);
    expect(m.kind).toBe("summary");
    expect(m.headline).toBeNull();
  });
  it("agrupado mostra total com aviso por tipo", () => {
    const m = resolveModernSidebar({ investment_summary_layout: "grouped" }, 87690);
    expect(m.kind).toBe("price_detailed");
    expect(m.note).toContain("tipo de serviço");
  });
  it("investimento desligado não mostra valores", () => {
    expect(resolveModernSidebar({ show_investment_section: false }, 1000).kind).toBe("summary");
  });
});
