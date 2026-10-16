import { describe, it, expect } from "vitest";
import { checkQuoteTimeline } from "@/lib/quoteAiTimeline";
import { diffServiceFields, applySelectedFields } from "@/lib/serviceFieldDiff";
import { isQuoteAiPilotEnabled } from "@/lib/quoteAiPilot";

const today = new Date(2026, 9, 16);
const flight = { id: "f", type: "flight", data: { resumo: { data_ida: "2027-01-10", data_retorno: "2027-01-20" } } };

describe("cronologia do piloto", () => {
  it("aponta noites sem hospedagem entre dois hotéis", () => {
    const w = checkQuoteTimeline([
      flight,
      { id: "h1", type: "hotel", data: { check_in: "2027-01-10", check_out: "2027-01-14" } },
      { id: "h2", type: "hotel", data: { check_in: "2027-01-16", check_out: "2027-01-20" } },
    ], { today });
    const gaps = w.filter((x) => x.kind === "uncovered_nights");
    expect(gaps).toHaveLength(1);
    expect(gaps[0].message).toContain("2 noite(s)");
    expect(gaps[0].message).toContain("14/01 a 16/01");
  });

  it("sem lacuna quando os hotéis cobrem toda a viagem", () => {
    const w = checkQuoteTimeline([
      flight,
      { id: "h1", type: "hotel", data: { check_in: "2027-01-10", check_out: "2027-01-15" } },
      { id: "h2", type: "hotel", data: { check_in: "2027-01-15", check_out: "2027-01-20" } },
    ], { today });
    expect(w.filter((x) => x.kind === "uncovered_nights")).toHaveLength(0);
  });

  it("aponta data passada sem alterá-la", () => {
    const block = { id: "a", type: "attraction", data: { data: "2026-10-01" } };
    const w = checkQuoteTimeline([block], { today });
    expect(w.some((x) => x.kind === "past_date")).toBe(true);
    expect(block.data.data).toBe("2026-10-01");
  });

  it("data sem ano é sinalizada como incompleta", () => {
    const w = checkQuoteTimeline([{ id: "a", type: "attraction", data: { data: "12 jan" } }], { today });
    expect(w[0].kind).toBe("invalid_date");
  });
});

describe("comparação do PDF", () => {
  it("só aplica campos selecionados e não apaga com vazio", () => {
    const cur = { nome_hotel: "Hotel A", noites: 4 };
    const inc = { nome_hotel: "Hotel B", noites: "", localizador: "XYZ" };
    const rows = diffServiceFields(cur, inc);
    expect(rows.map((r) => r.key).sort()).toEqual(["localizador", "nome_hotel"]);
    const out = applySelectedFields(cur, inc, ["localizador", "noites"]);
    expect(out).toEqual({ nome_hotel: "Hotel A", noites: 4, localizador: "XYZ" });
  });
});

describe("gate do piloto", () => {
  it("só admin com a chave de teste ligada", () => {
    expect(isQuoteAiPilotEnabled(false, "on")).toBe(false);
    expect(isQuoteAiPilotEnabled(true, null)).toBe(false);
    expect(isQuoteAiPilotEnabled(true, "on")).toBe(true);
  });
});
