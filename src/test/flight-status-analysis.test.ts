import { describe, it, expect } from "vitest";
import { analyzeFlight, computeFlightStatus, formatMissingFlightFields, resolveFlightSaveTotal } from "@/components/quote/flight-wizard/flightStatus";

const base = {
  airline: "LATAM",
  origin_city: "São Paulo",
  destination_city: "Lisboa",
  is_one_way: false,
};

describe("analyzeFlight", () => {
  it("aceita datas presentes somente nos trechos", () => {
    const r = analyzeFlight({
      ...base,
      departure_date: "",
      return_date: "",
      outbound_legs: [{ leg_date: "2026-05-01" }],
      return_legs: [{ leg_date: "2026-05-10" }],
      adult_price: 3200,
    });
    expect(r.status).toBe("ready");
    expect(r.missing).toEqual([]);
  });

  it("preço zero é válido: aceita passagem sem valor", () => {
    const r = analyzeFlight({ ...base, departure_date: "2026-05-01", return_date: "2026-05-10", adult_price: 0, child_price: 0 }, 0);
    expect(r.status).toBe("ready");
    expect(r.missing).toEqual([]);
  });

  it("ida simples não exige data de volta", () => {
    const r = analyzeFlight({ ...base, is_one_way: true, departure_date: "2026-05-01" });
    expect(r.status).toBe("ready");
  });

  it("ignora flight_status antigo e recalcula como ready", () => {
    const r = computeFlightStatus({ ...base, flight_status: "incomplete", outbound_legs: [{ leg_date: "2026-05-01" }], return_legs: [{ leg_date: "2026-05-09" }] }, false, 0);
    expect(r).toBe("ready");
  });

  it("mantém rascunho quando salvo intencionalmente", () => {
    expect(computeFlightStatus({ ...base }, true)).toBe("draft");
  });

  it("lista campos faltantes sem incluir preço", () => {
    const r = analyzeFlight({ ...base, departure_date: "2026-05-01" });
    expect(r.missing).toEqual(["data de volta"]);
    expect(formatMissingFlightFields(r.missing)).toBe("falta: data de volta");
    expect(formatMissingFlightFields(["data de ida", "data de volta"])).toBe("faltam: data de ida, data de volta");
  });

  it("preserva o amount total ao salvar passagem importada com preços unitários zerados", () => {
    expect(resolveFlightSaveTotal(0, 4500)).toBe(4500);
    expect(resolveFlightSaveTotal(1200, 4500)).toBe(1200);
  });
});
