import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
const src = readFileSync("src/pages/OrcamentoPublico.tsx", "utf8");
describe("caixa de descrição/observações do serviço", () => {
  it("usa 12% da terciária sobre branco", () => {
    expect(src).toContain('color-mix(in srgb, var(--brand-tertiary, #f4f4f5) 12%, #ffffff)');
    expect(src).not.toContain('var(--brand-tertiary, #f4f4f5) 17%, #ffffff)');
  });
  it("não usa mais a terciária pura nas caixas", () => {
    expect(src).not.toMatch(/border-l-2 border-primary\/40 px-4 py-3" style=\{\{ background: "var\(--brand-tertiary\)"/);
  });
});
