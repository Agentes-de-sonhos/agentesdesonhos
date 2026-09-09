import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
vi.mock("@/lib/pdfText", () => ({ extractPdfText: async () => "" }));

import { packageServiceToTripService, insertPackageServiceIntoTrip } from "@/lib/walletPackageImport";
import { publicAirportText, airportDisplayName, fillAirportNameIfEmpty } from "@/lib/airportDisplay";
import { parsedAirfareToFlightData, type ParsedAirfare } from "@/components/quote/flight-wizard/AirfareSmartImport";
import { mapQuoteServiceToTripService } from "@/utils/quoteToTrip";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

function flightParsed(): ParsedAirfare {
  return {
    resumo: { data_ida: "2026-07-10" },
    voos: [
      {
        ordem: 1, companhia_aerea: "LATAM", numero_voo: "LA3000",
        data_saida: "2026-07-10", hora_saida: "08:00", data_chegada: "2026-07-10", hora_chegada: "09:10",
        duracao: "01:10", origem_codigo: "JOI", origem_nome: "JOINVILLE",
        origem_aeroporto: "Aeroporto de Joinville",
        destino_codigo: "GRU", destino_nome: "SAO PAULO",
        destino_aeroporto: "Aeroporto de Guarulhos",
        numero_escalas: 0, equipamento: "320", cabine: "Econ.", base_tarifaria: "",
        bagagem_texto: "", bagagem_mochila_bolsa: null, bagagem_mao: null,
        bagagem_despachada: null, quantidade_bagagem_despachada: null, alerta: "",
      },
    ],
    valores: {},
    observacoes: [],
    campos_nao_identificados: [],
    confianca_extracao: { geral: 0.9 },
  };
}

describe("Carteira — importar pacote com IA", () => {
  it("converte serviço do pacote em serviço de carteira sem criar orçamento", () => {
    const mapped = packageServiceToTripService({
      service_type: "hotel",
      service_data: { hotel_name: "Hotel Ibis", city: "Paris", check_in: "2026-07-10", check_out: "2026-07-14" },
    });
    expect(mapped).not.toBeNull();
    expect(mapped!.type).toBe("hotel");
  });

  it("grava direto em trip_services com o order_index informado", async () => {
    const insert = vi.fn(async (_row: any) => ({ error: null }));
    const from = vi.fn((_table: string) => ({ insert }));
    const ok = await insertPackageServiceIntoTrip(
      { from } as any,
      "trip-1",
      { service_type: "hotel", service_data: { hotel_name: "Ibis", city: "Paris" } },
      3,
    );
    expect(ok).toBe(true);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from.mock.calls[0][0]).toBe("trip_services");
    expect(insert.mock.calls[0][0]).toMatchObject({ trip_id: "trip-1", order_index: 3 });
  });

  it("tipo não mapeável retorna null sem quebrar os demais", () => {
    expect(packageServiceToTripService({ service_type: "inexistente", service_data: {} })).toBeNull();
  });

  it("o fluxo da carteira não cria quotes nem quote_services", () => {
    const src = read("src/components/trip/ImportFullPackageIntoWalletDialog.tsx") + read("src/lib/walletPackageImport.ts");
    expect(src).not.toMatch(/from\(["']quotes["']\)/);
    expect(src).not.toMatch(/quote_services/);
    expect(src).toContain("trip_services");
  });

  it("a importação de pacote faz uma única chamada de IA", () => {
    const fn = read("supabase/functions/import-full-package/index.ts");
    const calls = fn.match(/ai\.google\.dev|generativelanguage|ai\.gateway\.lovable\.dev/g) || [];
    const fetches = fn.match(/await fetch\(/g) || [];
    expect(calls.length).toBeGreaterThan(0);
    expect(fetches.length).toBeLessThanOrEqual(2);
  });
});

describe("Nome público do aeroporto", () => {
  it("preserva o nome editado pelo agente (JOI / Aeroporto de Joinville)", () => {
    const mapped = parsedAirfareToFlightData(flightParsed());
    const leg = (mapped.outbound_legs || [])[0];
    expect(leg.airport_origin).toBe("JOI");
    expect(leg.origin_airport_name).toBe("Aeroporto de Joinville");
    expect(leg.destination_airport_name).toBe("Aeroporto de Guarulhos");
  });

  it("não altera o código IATA quando só o nome é editado", () => {
    const p = flightParsed();
    p.voos[0].origem_aeroporto = "Aeroporto de Joinville";
    const leg = (parsedAirfareToFlightData(p).outbound_legs || [])[0];
    expect(leg.airport_origin).toBe("JOI");
  });

  it("chega às visualizações públicas com fallback para código", () => {
    expect(publicAirportText({ code: "JOI", customName: "Aeroporto de Joinville" })).toBe("JOI – Aeroporto de Joinville");
    expect(publicAirportText({ code: "JOI" })).toBe("JOI");
    expect(publicAirportText({ code: "", city: "Joinville" })).toBe("Joinville");
  });

  it("normalização preenche vazio mas nunca sobrescreve nome manual", () => {
    expect(fillAirportNameIfEmpty("", "Aeroporto Lauro Carneiro de Loyola")).toBe("Aeroporto Lauro Carneiro de Loyola");
    expect(fillAirportNameIfEmpty("Aeroporto de Joinville", "Aeroporto Lauro Carneiro de Loyola")).toBe("Aeroporto de Joinville");
    expect(airportDisplayName({ code: "JOI", customName: "Aeroporto de Joinville" })).toBe("Aeroporto de Joinville");
  });

  it("propaga o nome personalizado do orçamento para a carteira", () => {
    const trip = mapQuoteServiceToTripService({
      service_type: "flight",
      service_data: {
        airline: "LATAM",
        origin_city: "Joinville",
        destination_city: "São Paulo",
        outbound_legs: [{
          airport_origin: "JOI", airport_destination: "GRU",
          origin_airport_name: "Aeroporto de Joinville",
          destination_airport_name: "Aeroporto de Guarulhos",
          leg_date: "2026-07-10",
        }],
        return_legs: [],
      },
    } as any);
    const seg = (trip!.data as any).segments[0];
    expect(seg.origin_airport_name).toBe("Aeroporto de Joinville");
    expect(seg.destination_airport_name).toBe("Aeroporto de Guarulhos");
  });
});
