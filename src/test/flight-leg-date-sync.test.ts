import { describe, it, expect } from "vitest";
import { syncFirstLegDate } from "@/lib/flightLegDateSync";
import { parsedAirfareToFlightData } from "@/components/quote/flight-wizard/AirfareSmartImport";
import { formatPublicShortDate } from "@/lib/publicLocale";

describe("datas da passagem aérea", () => {
  it("corrige trecho 27/02/2026 quando o calendário escolhe 27/02/2027", () => {
    const legs = syncFirstLegDate([{ leg_date: "2026-02-27" }], "2026-02-27", "2027-02-27");
    expect(legs![0].leg_date).toBe("2027-02-27");
  });
  it("preenche trecho vazio e segue a data anterior", () => {
    expect(syncFirstLegDate([{ leg_date: "" }], "", "2027-03-14")![0].leg_date).toBe("2027-03-14");
    expect(syncFirstLegDate([{ leg_date: "2027-02-20" }], "2027-02-20", "2027-02-27")![0].leg_date).toBe("2027-02-27");
  });
  it("preserva data de trecho diferente digitada pelo agente (ex.: pernoite)", () => {
    expect(syncFirstLegDate([{ leg_date: "2027-02-28" }], "2027-02-27", "2027-02-26")![0].leg_date).toBe("2027-02-28");
  });
  it("importação sem ano usa o ano da viagem, não o ano corrente", () => {
    const m = parsedAirfareToFlightData(
      { voos: [
        { data_saida: "27/02", origem_codigo: "GRU", destino_codigo: "ATL", direcao: "ida" },
        { data_saida: "14/03", origem_codigo: "ATL", destino_codigo: "GRU", direcao: "volta" },
      ] } as any,
      { tripStartDate: new Date(2027, 1, 27) },
    );
    const dates = [...(m.outbound_legs || []), ...(m.return_legs || [])].map((l) => l.leg_date);
    expect(dates).toContain("2027-02-27");
    expect(dates).toContain("2027-03-14");
    expect(dates.every((d) => d?.startsWith("2027"))).toBe(true);
  });
  it("PDF mostra exatamente o dia salvo, sem fuso", () => {
    expect(formatPublicShortDate("2027-02-27", "pt-BR" as any)).toContain("27");
    expect(formatPublicShortDate("2027-02-27", "pt-BR" as any)).toContain("2027");
  });
});
