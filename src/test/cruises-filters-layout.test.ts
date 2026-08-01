import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Teste estrutural: a linha superior de filtros (tipos + busca) não pode
 * quebrar em viewports não mobile (>= md / 768px).
 */
const source = readFileSync(resolve(process.cwd(), "src/pages/CruisesPage.tsx"), "utf8");

function classOf(testId: string): string {
  const idx = source.indexOf(`data-testid="${testId}"`);
  expect(idx).toBeGreaterThan(-1);
  const match = source.slice(idx).match(/className=\{?"([^"]+)"/);
  return match?.[1] ?? "";
}

describe("linha superior de filtros — Companhias Marítimas", () => {
  it("empilha no mobile e vira linha única sem quebra a partir de md", () => {
    const row = classOf("cruise-filters-row");
    expect(row).toContain("flex-col");
    expect(row).toContain("md:flex-row");
    expect(row).toContain("md:flex-nowrap");
    expect(row).not.toContain("flex-wrap ");
  });

  it("grupo dos quatro tipos usa nowrap e largura pelo conteúdo", () => {
    const group = classOf("cruise-tipo-group");
    expect(group).toContain("flex-nowrap");
    expect(group).toContain("md:shrink-0");
    expect(group).not.toContain("flex-wrap ");
    // rolagem apenas no mobile
    expect(group).toContain("overflow-x-auto");
    expect(group).toContain("md:overflow-visible");
  });

  it("busca é flexível, alinhada à direita em desktop", () => {
    const search = classOf("cruise-search-wrapper");
    expect(search).toContain("w-full");
    expect(search).toContain("md:flex-1");
    expect(search).toContain("md:min-w-[240px]");
    expect(search).toContain("md:ml-auto");
  });

  it("mantém os quatro tipos de navegação", () => {
    ["Todos", "Oceânico", "Fluvial", "Expedição"].forEach((label) => {
      expect(source).toContain(label);
    });
  });
});