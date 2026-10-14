import { describe, it, expect } from "vitest";
import { mergeFullAirfareDefaults } from "@/lib/tripFlightImport";

const raw = {
  voos: [
    { ordem: 1, numero_voo: "LA 762", origem_codigo: "GRU", destino_codigo: "MVD", data_saida: "2026-10-21", hora_saida: "13:15", hora_chegada: "15:55", companhia_aerea: "LATAM" },
    { ordem: 2, numero_voo: "LA 763", origem_codigo: "MVD", destino_codigo: "GRU", data_saida: "2026-10-29", hora_saida: "17:25", hora_chegada: "20:00", companhia_aerea: "LATAM" },
  ],
  reserva: { localizador: "WOSJZS", status_emissao: "emitido" },
  passageiros: [
    { nome: "Eduardo Carvalho", tipo: "adulto", bilhete: "957.2302.720650", assentos: [{ assento: "13A", trecho_ordem: 1 }] },
    { nome: "Oswaldo Carvalho Neto", tipo: "adulto", bilhete: "957.2302.720651" },
  ],
};

describe("importação de passagem na Carteira Digital", () => {
  it("preenche localizador, passageiros, bilhetes e anexa o arquivo", () => {
    const file = new File(["x"], "bilhete.pdf", { type: "application/pdf" });
    const out = mergeFullAirfareDefaults({ locator_code: "", passengers: [], segments: [{ flight_number: "LA 762" }] }, raw, file);
    expect(out.locator_code).toBe("WOSJZS");
    expect(out.passengers).toHaveLength(2);
    expect(out.passengers[0].document).toContain("957.2302.720650");
    expect(out.flight_status).toBe("emitido");
    expect(out.__importedFiles).toEqual([file]);
  });
});
