import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getOpportunityCardShortcuts,
  isClosedOpportunityStage,
  operationStageShowsWallet,
} from "@/lib/crmCardShortcuts";
import { fireCelebrationConfetti } from "@/lib/celebrationConfetti";

// Etapas renomeadas de propósito: as regras seguem posição/legacy_key.
const stages = [
  { id: "s1", legacy_key: "new_contact" },
  { id: "s2", legacy_key: "in_service" },
  { id: "s3", legacy_key: "quote_creating" },
  { id: "s4", legacy_key: "quote_sent" },
  { id: "s5", legacy_key: "closed" },
  { id: "s6", legacy_key: "lost" },
];

describe("atalhos dos cards de Oportunidades", () => {
  it("mostra Gerar orçamento nas 3 primeiras colunas", () => {
    expect(getOpportunityCardShortcuts(stages, "s1").quote).toBe(true);
    expect(getOpportunityCardShortcuts(stages, "s2").quote).toBe(true);
    expect(getOpportunityCardShortcuts(stages, "s3").quote).toBe(true);
    expect(getOpportunityCardShortcuts(stages, "s4").quote).toBe(false);
  });

  it("mostra carteira digital somente na etapa de fechamento", () => {
    expect(getOpportunityCardShortcuts(stages, "s5")).toEqual({ quote: false, wallet: true });
    expect(getOpportunityCardShortcuts(stages, "s2").wallet).toBe(false);
    expect(getOpportunityCardShortcuts(stages, "s6")).toEqual({ quote: false, wallet: false });
  });

  it("Fechado tem prioridade quando reordenado para as 3 primeiras", () => {
    const reordered = [stages[4], stages[0], stages[1], stages[2]];
    expect(getOpportunityCardShortcuts(reordered, "s5")).toEqual({ quote: false, wallet: true });
    expect(getOpportunityCardShortcuts(reordered, "s2").quote).toBe(true);
  });

  it("etapa desconhecida ou ausente não mostra atalhos", () => {
    expect(getOpportunityCardShortcuts(stages, null)).toEqual({ quote: false, wallet: false });
    expect(getOpportunityCardShortcuts(stages, "zz")).toEqual({ quote: false, wallet: false });
  });

  it("identifica fechamento pelo identificador, não pelo nome", () => {
    expect(isClosedOpportunityStage({ legacy_key: "closed" })).toBe(true);
    expect(isClosedOpportunityStage({ legacy_key: "negotiation" })).toBe(false);
    expect(isClosedOpportunityStage(null)).toBe(false);
  });
});

describe("atalhos dos cards de Operações", () => {
  const opStages = [{ key: "a" }, { key: "b" }, { key: "c" }];
  it("carteira digital só na 1ª e 2ª colunas", () => {
    expect(operationStageShowsWallet(opStages, "a")).toBe(true);
    expect(operationStageShowsWallet(opStages, "b")).toBe(true);
    expect(operationStageShowsWallet(opStages, "c")).toBe(false);
    expect(operationStageShowsWallet(opStages, null)).toBe(false);
  });
});

describe("confetes da venda ganha", () => {
  afterEach(() => {
    document.querySelectorAll("[data-celebration-confetti]").forEach((el) => el.remove());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("monta um overlay não clicável e limpa após a animação", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    fireCelebrationConfetti();
    const overlay = document.querySelector("[data-celebration-confetti]") as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.style.pointerEvents).toBe("none");
    vi.advanceTimersByTime(3000);
    expect(document.querySelector("[data-celebration-confetti]")).toBeNull();
  });

  it("respeita prefers-reduced-motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    fireCelebrationConfetti();
    expect(document.querySelector("[data-celebration-confetti]")).toBeNull();
  });

  it("usa o elemento em tela cheia quando existe", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const fs = document.createElement("div");
    document.body.appendChild(fs);
    Object.defineProperty(document, "fullscreenElement", { value: fs, configurable: true });
    fireCelebrationConfetti();
    expect(fs.querySelector("[data-celebration-confetti]")).toBeTruthy();
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    fs.remove();
  });
});
