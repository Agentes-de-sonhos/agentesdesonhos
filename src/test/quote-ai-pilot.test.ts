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

describe("gate do piloto (UI)", () => {
  const host = "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app";
  it("oculto quando o servidor não confirma (flag off ou fora da lista)", () => {
    expect(isQuoteAiPilotEnabled({ host, flag: "on", eligible: false })).toBe(false);
    expect(isQuoteAiPilotEnabled({ host, flag: "on", eligible: undefined })).toBe(false);
  });
  it("oculto sem a chave local, mesmo elegível", () => {
    expect(isQuoteAiPilotEnabled({ host, flag: null, eligible: true })).toBe(false);
  });
  it("oculto no site publicado e em domínios de agência", () => {
    expect(isQuoteAiPilotEnabled({ host: "agentedesonhoproject.lovable.app", flag: "on", eligible: true })).toBe(false);
    expect(isQuoteAiPilotEnabled({ host: "app.agentesdesonhos.com.br", flag: "on", eligible: true })).toBe(false);
  });
  it("visível só no preview com chave local e confirmação do servidor", () => {
    expect(isQuoteAiPilotEnabled({ host, flag: "on", eligible: true })).toBe(true);
  });
});

describe("exemplo do proprietário (Orlando, outubro)", () => {
  it("aponta a noite 15→16 sem hotel e datas passadas", () => {
    const w = checkQuoteTimeline([
      { id: "f", type: "flight", data: { resumo: { data_ida: "2027-10-10", data_retorno: "2027-10-21" } } },
      { id: "h1", type: "hotel", label: "Portofino", data: { check_in: "2027-10-10", check_out: "2027-10-15" } },
      { id: "h2", type: "hotel", label: "Pop Century", data: { check_in: "2027-10-16", check_out: "2027-10-21" } },
    ], { today: new Date(2026, 9, 16) });
    const gap = w.find((x) => x.kind === "uncovered_nights");
    expect(gap?.message).toContain("1 noite(s)");
    expect(gap?.message).toContain("15/10 a 16/10");
    const past = checkQuoteTimeline([{ id: "h", type: "hotel", data: { check_in: "2026-10-10", check_out: "2026-10-15" } }], { today: new Date(2026, 9, 16) });
    expect(past.filter((x) => x.kind === "past_date")).toHaveLength(2);
  });
});
