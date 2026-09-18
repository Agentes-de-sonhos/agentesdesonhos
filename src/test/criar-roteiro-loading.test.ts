import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/CriarRoteiro.tsx"),
  "utf-8",
);

describe("Criar Roteiro — resolução inicial da rota", () => {
  it("inicia em loading quando a rota contém um roteiro existente", () => {
    expect(source).toContain(
      "useState(Boolean(id))",
    );
    expect(source).toContain(
      "if (id && (isRouteItineraryLoading || !currentItinerary))",
    );
    expect(source).toContain('aria-label="Carregando roteiro"');
  });

  it("não usa o formulário de criação como fallback de erro da edição", () => {
    const loadingGuard = source.indexOf(
      "if (id && (isRouteItineraryLoading || !currentItinerary))",
    );
    const creationBranch = source.indexOf("{!currentItinerary ? (");

    expect(loadingGuard).toBeGreaterThan(0);
    expect(loadingGuard).toBeLessThan(creationBranch);
    expect(source).toContain('title="Não foi possível carregar o roteiro"');
  });

  it("mantém a criação normal quando a rota não possui ID", () => {
    expect(source).toContain("if (!id) {");
    expect(source).toContain("setIsRouteItineraryLoading(false)");
    expect(source).toContain("<ItineraryForm");
  });

  it("ignora respostas antigas quando o ID muda ou a tela desmonta", () => {
    expect(source).toContain("let isCurrentRequest = true");
    expect(source).toContain("if (!isCurrentRequest) return");
    expect(source).toContain("isCurrentRequest = false");
  });
});