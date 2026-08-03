import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isWithinNewsDayWindow, NEWS_DAY_START_HOUR } from "@/lib/newsRanking";

const ref = new Date("2026-08-03T18:00:00Z"); // 15:00 em SP

describe("janela diária do Radar (America/Sao_Paulo, 07:00–23:59:59)", () => {
  it("inclui notícia do mesmo dia local após 07:00", () => {
    expect(isWithinNewsDayWindow("2026-08-03T10:05:00Z", ref)).toBe(true); // 07:05 SP
  });
  it("exclui notícia antes das 07:00 locais", () => {
    expect(isWithinNewsDayWindow("2026-08-03T09:00:00Z", ref)).toBe(false); // 06:00 SP
  });
  it("exclui dias anteriores", () => {
    expect(isWithinNewsDayWindow("2026-08-02T20:00:00Z", ref)).toBe(false);
  });
  it("usa o fuso de SP e não UTC na virada", () => {
    expect(isWithinNewsDayWindow("2026-08-04T02:30:00Z", ref)).toBe(true); // 23:30 SP do dia 03
  });
  it("hora de corte é 07", () => {
    expect(NEWS_DAY_START_HOUR).toBe(7);
  });
});

describe("seletor visual do dia", () => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/Noticias.tsx"), "utf8");
  it("possui os dois modos e inicia em Todas do dia", () => {
    expect(src).toContain('data-testid="news-day-mode-group"');
    expect(src).toContain("Todas do dia");
    expect(src).toContain("Explorar por categoria");
    expect(src).toContain('useState<"day" | "category">("day")');
  });
  it("chips de categoria derivados dos dados e sem rolagem horizontal", () => {
    expect(src).toContain("dayCategories");
    expect(src).toContain('data-testid="news-day-categories"');
    expect(src).toContain("flex flex-wrap gap-2");
    expect(src).not.toContain("overflow-x-auto");
  });
  it("listagem usa a janela diária", () => {
    expect(src).toContain("isWithinNewsDayWindow");
    expect(src).toContain("dayNews.filter");
  });
});

describe("sem listagem duplicada nem dropdown de categoria", () => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/Noticias.tsx"), "utf8");
  it("não possui a listagem geral repetida ao final", () => {
    expect(src).not.toContain("{/* Todas as notícias */}");
    expect(src).not.toContain("setVisibleCount");
  });
  it("não possui o dropdown Todas as categorias", () => {
    expect(src).not.toContain("Todas as categorias");
    expect(src).not.toContain('placeholder="Categoria"');
  });
  it("preserva busca, portais e ordenação", () => {
    expect(src).toContain('placeholder="Buscar notícias"');
    expect(src).toContain("Todos os portais");
    expect(src).toContain("Mais recentes");
  });
});
