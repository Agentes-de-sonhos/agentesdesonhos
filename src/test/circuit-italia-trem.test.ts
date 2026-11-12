import { describe, expect, it } from "vitest";
import { findCircuit } from "@/lib/circuits";
import { ITALIA_EM_TREM } from "@/lib/circuits/italiaEmTrem";
import { circuitDepartureDate, circuitNights } from "@/lib/circuits/presentation";
import { CURTI_VIAGENS_OFFICIAL_PROFILE, CURTI_VIAGENS_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { existsSync } from "node:fs";

describe("Itália em Trem da Curti", () => {
  it("mantém o roteiro exclusivo da Curti", () => {
    for (const host of ["curtiviagens.com.br", "www.curtiviagens.com.br"])
      expect(findCircuit("italia-em-trem", host)).toBe(ITALIA_EM_TREM);
    for (const host of ["dricaviagens.com.br", "omundoemcores.com.br", "essyatur.com.br"])
      expect(findCircuit("italia-em-trem", host)).toBeUndefined();
  });
  it("oferece todas as 214 saídas entre abril e outubro sem dias inválidos", () => {
    const dates = ITALIA_EM_TREM.departures.flatMap(month => month.days.map(day => circuitDepartureDate(month.month, day)));
    expect(dates).toHaveLength(214);
    expect(new Set(dates).size).toBe(214);
    expect(dates[0]).toBe("2027-04-01");
    expect(dates.at(-1)).toBe("2027-10-31");
    for (const date of dates) expect(new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10)).toBe(date);
  });
  it("preserva as 11 noites e as quatro bases do PDF", () => {
    expect(ITALIA_EM_TREM.itinerary).toHaveLength(12);
    expect(["Roma", "Sorrento", "Bari", "Lecce"].map(city => circuitNights(ITALIA_EM_TREM, city))).toEqual([2, 5, 2, 2]);
    expect(existsSync(`public${ITALIA_EM_TREM.pdfUrl}`)).toBe(true);
  });
  it("liga o destaque europeu oficial ao roteiro sem alterar a base compartilhada", () => {
    expect(CURTI_VIAGENS_OFFICIAL_PROFILE.destinations?.find(d => d.key === "italia-em-trem")?.href).toBe("/circuitos/italia-em-trem");
    expect(CURTI_VIAGENS_PREVIEW_PROFILE.destinations?.find(d => d.key === "europa")?.title).toBe("Europa");
  });
});
