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

  it("aceita preço vindo apenas do amount total do serviço", () => {
    const r = analyzeFlight({ ...base, departure_date: "2026-05-01", return_date: "2026-05-10", adult_price: 0, child_price: 0 }, 4500);
    expect(r.status).toBe("ready");
  });

  it("ida simples não exige data de volta", () => {
    const r = analyzeFlight({ ...base, is_one_way: true, departure_date: "2026-05-01", adult_price: 1000 });
    expect(r.status).toBe("ready");
  });

  it("ignora flight_status antigo e recalcula como ready", () => {
    const r = computeFlightStatus({ ...base, flight_status: "incomplete", outbound_legs: [{ leg_date: "2026-05-01" }], return_legs: [{ leg_date: "2026-05-09" }] }, false, 8000);
    expect(r).toBe("ready");
  });

  it("mantém rascunho quando salvo intencionalmente", () => {
    expect(computeFlightStatus({ ...base }, true)).toBe("draft");
  });

  it("lista campos faltantes com nomes amigáveis", () => {
    const r = analyzeFlight({ ...base, departure_date: "2026-05-01" });
    expect(r.missing).toEqual(["data de volta", "valor do serviço"]);
    expect(formatMissingFlightFields(r.missing)).toBe("faltam: data de volta, valor do serviço");
    expect(formatMissingFlightFields(["valor do serviço"])).toBe("falta: valor do serviço");
  });

  it("preserva o amount total ao salvar passagem importada com preços unitários zerados", () => {
    const computedTotal = 0;
    const existingAmount = 4500;
    const effectiveTotal = resolveFlightSaveTotal(computedTotal, existingAmount);
    expect(effectiveTotal).toBe(existingAmount);

    const status = computeFlightStatus(
      { ...base, departure_date: "2026-05-01", return_date: "2026-05-10", adult_price: 0, child_price: 0 },
      false,
      effectiveTotal
    );
    expect(status).toBe("ready");
  });
});
