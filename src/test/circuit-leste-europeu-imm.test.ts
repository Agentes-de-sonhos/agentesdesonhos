import { describe, expect, it } from "vitest";
import { findCircuit } from "@/lib/circuits";
import { LESTE_EUROPEU_PREMIUM_2027 as circuit } from "@/lib/circuits/lesteEuropeuPremium2027";
import { circuitDepartureDate, circuitNights, circuitRequestPayload } from "@/lib/circuits/presentation";
import { IMM_OFFICIAL_PROFILE, DRICA_PRESENTATION_PROFILE } from "@/lib/adsBriefingPreview";

describe("Leste Europeu Premium 2027 da IMM", () => {
  it("limita o novo circuito aos domínios da IMM", () => {
    for (const host of ["immturismo.com.br", "www.immturismo.com.br"])
      expect(findCircuit(circuit.slug, host)).toBe(circuit);
    for (const host of ["dricaviagens.com.br", "arenatravelgroup.com.br", "omundoemcores.com.br", "fake.immturismo.com.br"])
      expect(findCircuit(circuit.slug, host)).toBeUndefined();
  });
  it("preserva o preço em euros de 2590 por pessoa em dupla", () => {
    expect(circuit.currency).toBe("EUR");
    expect(circuit.fromPrice).toBe(2590);
  });
  it("preserva suplemento individual de 1500 euros", () => expect(circuit.singleSupplement).toBe(1500));
  it("deriva as dez noites dos onze dias, sem noites nas cidades de passagem", () => {
    expect(circuit.itinerary).toHaveLength(11);
    expect(circuit.cities.map(city => circuitNights(circuit, city))).toEqual([3, 2, 0, 3, 0, 2]);
  });
  it("oferece as 31 quintas-feiras publicadas entre abril e outubro de 2027", () => {
    const dates = circuit.departures.flatMap(m => m.days.map(d => circuitDepartureDate(m.month, d)));
    expect(dates).toHaveLength(31);
    expect(new Set(dates).size).toBe(31);
    expect(dates[0]).toBe("2027-04-01");
    expect(dates.at(-1)).toBe("2027-10-28");
    for (const date of dates) expect(new Date(`${date}T12:00:00Z`).getUTCDay()).toBe(4);
  });
  it("inclui o destaque na IMM sem inserir o circuito na Drica", () => {
    expect(IMM_OFFICIAL_PROFILE.destinations?.find(d => d.key === circuit.slug)?.href).toBe(`/circuitos/${circuit.slug}`);
    expect(DRICA_PRESENTATION_PROFILE.destinations?.some(d => d.href === `/circuitos/${circuit.slug}`)).toBe(false);
    expect(DRICA_PRESENTATION_PROFILE.destinations?.find(d => d.key === "capitais-da-italia")?.href).toBe("/circuitos/capitais-da-italia");
  });
  it("encaminha o card Resorts no Brasil para a página dedicada de resorts", () => {
    const card = IMM_OFFICIAL_PROFILE.destinations?.find(d => d.key === "resorts-brasil-review");
    expect(card?.title).toBe("Resorts no Brasil");
    expect(card?.href).toBe("/resorts-brasil");
    expect(card?.ctaLabel).toBe("Ver resorts");
    expect(IMM_OFFICIAL_PROFILE.resortsMap?.enabled).toBe(true);
  });
  it("transmite a saída escolhida pelo fluxo compartilhado sem definir proprietário no navegador", () => {
    const payload = circuitRequestPayload(circuit, "2027-05-20", { name: "Teste de circuito", phone: "", email: "teste@example.com", adults: 2, children: 0, notes: "", consent: true }, "");
    expect(payload.details.data_inicio).toBe("2027-05-20");
    expect(payload.details.adultos).toBe(2);
    expect(payload).not.toHaveProperty("user_id");
    expect(payload).not.toHaveProperty("agency_id");
  });
});