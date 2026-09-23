import { describe, it, expect, beforeEach } from "vitest";
import {
  INITIAL_SETUP_HIGHLIGHT_CLASS,
  isInitialSetupItemPending,
  pendingInitialSetup,
  resetAutoSuggestIntro,
  shouldAutoSuggestIntro,
  suggestQuoteTitle,
} from "@/lib/quoteInitialSetup";

describe("configuração inicial guiada do orçamento", () => {
  beforeEach(() => resetAutoSuggestIntro());

  it("destaca apenas título, capa e descrição quando faltam", () => {
    const pending = pendingInitialSetup({
      trip_title: null,
      destination_intro_text: null,
      destination_intro_images: [],
      show_destination_intro: true,
    });
    expect(pending.map((p) => p.key)).toEqual(["title", "cover", "intro"]);
    expect(pending.map((p) => p.hint)).toEqual([
      "Adicione um título",
      "Escolha uma foto de capa",
      "Gere ou escreva a descrição do destino",
    ]);
  });

  it("o destaque desaparece ao preencher", () => {
    const filled = {
      trip_title: "Orlando em julho",
      destination_intro_text: "Um destino incrível.",
      destination_intro_images: ["foto.jpg"],
      show_destination_intro: true,
    };
    expect(pendingInitialSetup(filled)).toEqual([]);
    expect(isInitialSetupItemPending(filled, "title")).toBe(false);
  });

  it("não cobra capa/descrição quando a apresentação está desligada", () => {
    const pending = pendingInitialSetup({
      trip_title: "Título",
      destination_intro_text: null,
      destination_intro_images: [],
      show_destination_intro: false,
    });
    expect(pending).toEqual([]);
  });

  it("usa azul suave, sem aparência de erro", () => {
    expect(INITIAL_SETUP_HIGHLIGHT_CLASS).toContain("sky");
    expect(INITIAL_SETUP_HIGHLIGHT_CLASS).not.toContain("destructive");
    expect(INITIAL_SETUP_HIGHLIGHT_CLASS).not.toContain("red");
  });

  it("sugere um título a partir dos dados existentes", () => {
    expect(
      suggestQuoteTitle({ destination: "Orlando", start_date: "2026-07-01", end_date: "2026-07-11", adults_count: 2, children_count: 1 }),
    ).toBe("Viagem para Orlando · 10 dias · 2 adultos e 1 criança");
    expect(suggestQuoteTitle({ destination: "" })).toBeNull();
  });

  it("a sugestão automática de descrição acontece uma vez por orçamento", () => {
    expect(shouldAutoSuggestIntro("q1", false)).toBe(true);
    expect(shouldAutoSuggestIntro("q1", false)).toBe(false);
    expect(shouldAutoSuggestIntro("q1", false)).toBe(false);
    expect(shouldAutoSuggestIntro("q2", false)).toBe(true);
  });

  it("não sugere automaticamente quando já existe texto", () => {
    expect(shouldAutoSuggestIntro("q3", true)).toBe(false);
    expect(shouldAutoSuggestIntro("", false)).toBe(false);
  });
});
