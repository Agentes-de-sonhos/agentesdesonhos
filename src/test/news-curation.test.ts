import { describe, it, expect } from "vitest";
import {
  isCurationEligible,
  mergeTop5,
  newsEngagementScore,
  spWeekStartKey,
  spDateKey,
  highlightMode,
} from "@/lib/newsRanking";

const base = { status: "aprovado", hidden: false } as const;

describe("janela semanal (America/Sao_Paulo)", () => {
  it("domingo pertence à semana iniciada na segunda anterior", () => {
    expect(spWeekStartKey(new Date("2026-08-02T14:00:00Z"))).toBe("2026-07-27");
  });
  it("segunda reinicia a janela", () => {
    expect(spWeekStartKey(new Date("2026-08-03T14:00:00Z"))).toBe("2026-08-03");
  });
  it("modo do bloco principal por dia da semana", () => {
    expect(highlightMode(new Date("2026-08-02T14:00:00Z"))).toBe("weekly");
    expect(highlightMode(new Date("2026-08-03T14:00:00Z"))).toBe("daily");
  });
  it("data local perto da meia-noite UTC", () => {
    expect(spDateKey(new Date("2026-08-03T02:30:00Z"))).toBe("2026-08-02");
  });
});

describe("elegibilidade temporal da curadoria manual", () => {
  it("daily aceita apenas publicação do mesmo dia local", () => {
    expect(isCurationEligible({ ...base, curationType: "daily", periodStart: "2026-08-03", publishedAt: "2026-08-03T13:00:00Z" })).toBe(true);
    expect(isCurationEligible({ ...base, curationType: "daily", periodStart: "2026-08-03", publishedAt: "2026-08-01T13:00:00Z" })).toBe(false);
  });
  it("weekly/top5 aceitam apenas publicação dentro da semana", () => {
    expect(isCurationEligible({ ...base, curationType: "top5", periodStart: "2026-08-03", publishedAt: "2026-08-07T13:00:00Z" })).toBe(true);
    expect(isCurationEligible({ ...base, curationType: "weekly", periodStart: "2026-08-03", publishedAt: "2026-08-11T13:00:00Z" })).toBe(false);
  });
  it("period_start semanal que não é segunda é bloqueado", () => {
    expect(isCurationEligible({ ...base, curationType: "weekly", periodStart: "2026-08-04", publishedAt: "2026-08-04T13:00:00Z" })).toBe(false);
  });
  it("notícia oculta ou não aprovada é bloqueada", () => {
    expect(isCurationEligible({ curationType: "daily", periodStart: "2026-08-03", publishedAt: "2026-08-03T13:00:00Z", status: "pendente", hidden: false })).toBe(false);
    expect(isCurationEligible({ curationType: "daily", periodStart: "2026-08-03", publishedAt: "2026-08-03T13:00:00Z", status: "aprovado", hidden: true })).toBe(false);
  });
});

describe("merge manual + automático no Top 5", () => {
  const auto = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
  it("mantém posições manuais e completa 1–5 sem duplicar", () => {
    const merged = mergeTop5([{ position: 2, item: { id: "f" } }], auto);
    expect(merged.map((m) => m.position)).toEqual([1, 2, 3, 4, 5]);
    expect(merged.find((m) => m.position === 2)?.item.id).toBe("f");
    expect(new Set(merged.map((m) => m.item.id)).size).toBe(5);
    expect(merged.filter((m) => m.item.id === "f")).toHaveLength(1);
  });
  it("fórmula de engajamento = reads + 2×likes", () => {
    expect(newsEngagementScore(10, 3)).toBe(16);
  });
});
