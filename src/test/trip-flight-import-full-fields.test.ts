import { describe, it, expect } from "vitest";
import { parsedAirfareToTripFlightData } from "@/lib/tripFlightImport";

const raw = {
  resumo: { tipo_tarifa: "RT" },
  reserva: { localizador: "WOSJZS", checkin_abertura: "48h antes" },
  voos: [
    { ordem: 1, companhia_aerea: "LATAM", numero_voo: "LA762", data_saida: "2026-10-21", hora_saida: "13:15", hora_chegada: "15:55", origem_codigo: "GRU", origem_nome: "São Paulo", destino_codigo: "MVD", destino_nome: "Montevidéu", terminal_saida: "3" },
    { ordem: 2, companhia_aerea: "LATAM", numero_voo: "LA763", data_saida: "2026-10-29", hora_saida: "17:25", hora_chegada: "20:00", origem_codigo: "MVD", origem_nome: "Montevidéu", destino_codigo: "GRU", destino_nome: "São Paulo" },
  ],
  passageiros: [
    { nome: "Eduardo Carvalho", tipo: "ADT", bilhete: "957.2302.720650", fidelidade: "LA 29559565893", assentos: [{ trecho_ordem: 1, assento: "13A" }, { trecho_ordem: 2, assento: "16A" }] },
    { nome: "Oswaldo Carvalho Neto", tipo: "ADT", bilhete: "957.2302.720651" },
  ],
};

describe("parsedAirfareToTripFlightData", () => {
  it("preenche localizador, passageiros, bilhetes e assentos", () => {
    const d = parsedAirfareToTripFlightData(raw);
    expect(d.locator_code).toBe("WOSJZS");
    expect(d.flight_status).toBe("emitido");
    expect(d.trip_type).toBe("ida_volta");
    expect(d.destination_city).toBe("Montevidéu");
    expect(d.passengers).toHaveLength(2);
    expect(d.passengers[0].document).toContain("957.2302.720650");
    expect(d.passengers[0].seat).toContain("13A");
    expect(d.passengers[0].notes).toContain("LA 29559565893");
    expect(d.segments[0].terminal).toBe("3");
    expect(d.segments[1].segment_type).toBe("volta");
    expect(d.checkin_open_date).toBe("48h antes");
  });
  it("deixa vazio o que não veio do documento", () => {
    const d = parsedAirfareToTripFlightData({ voos: [{ ordem: 1, numero_voo: "G31" }] });
    expect(d.locator_code).toBe("");
    expect(d.passengers).toEqual([]);
    expect(d.checkin_url).toBe("");
    expect(d.required_documents).toBe("");
  });
});
