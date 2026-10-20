import { describe, expect, it } from "vitest";
import { DISNEY_INCLUDED_EVENT_IDS, buildDisneyRequest, recommendTicket, ticketPath, tripDaysInclusive, validateHopperIntent, validateThemeDays, validateTravelers, type DisneyPlan } from "@/lib/disneyTickets";
import { DISNEY_EVENTS } from "@/components/landing/disney/content";
import { DISNEY_HOTELS, getDisneyHotel } from "@/components/landing/disney/disneyHotelsCatalog";

const base: DisneyPlan = { themes: [], waters: [], events: [], periodMode: "months", arrival: "", departure: "", months: ["2027-07"], themeDays: 4, themeDaysHelp: false, hopper: null, waterVisits: null, lightningLane: false, hotelInterest: false, tenPlus: 2, kids: 0, infants: 0, ages: [], name: "Teste", whatsapp: "(11) 99999-9999", email: "" };
const fw = { id: "epcot-food-wine", name: "Food & Wine", ticket: "included" as const };
const party = { id: "mnsshp", name: "Halloween Party", ticket: "separate" as const };

describe("eventos incluídos × ingresso separado", () => {
  it("lista de festivais incluídos bate com o conteúdo", () => {
    expect(DISNEY_EVENTS.filter((e) => e.ticket === "included").map((e) => e.id).sort()).toEqual([...DISNEY_INCLUDED_EVENT_IDS].sort());
  });
  for (const id of DISNEY_INCLUDED_EVENT_IDS) {
    it(`${id} sem temáticos nunca vira ingresso de evento`, () => {
      const r = recommendTicket({ themes: [], waters: [], events: [id], hopper: null, waterExtras: "no" });
      expect(r).toBe("epcot_festival_guidance");
      expect(ticketPath([], [], [id])).toBe("festival_needs_epcot");
    });
  }
  it("festival + EPCOT → ingresso temático normal", () => expect(recommendTicket({ themes: ["epcot"], waters: [], events: [fw], hopper: null, waterExtras: "no" })).toBe("one_park_per_day"));
  it("festival + Magic Kingdom sem EPCOT → orientação", () => expect(recommendTicket({ themes: ["magic-kingdom"], waters: [], events: [fw], hopper: null, waterExtras: "no" })).toBe("epcot_festival_guidance"));
  it("festa separada sozinha → ingresso da festa", () => expect(recommendTicket({ themes: [], waters: [], events: [party], hopper: null, waterExtras: "no" })).toBe("event_only"));
  it("festival + festa separada sem EPCOT → orientação", () => expect(recommendTicket({ themes: [], waters: [], events: [fw, party], hopper: null, waterExtras: "no" })).toBe("epcot_festival_guidance"));
  it("payload separa tipos", () => {
    const r = buildDisneyRequest({ ...base, events: [fw, party] });
    expect(r.details.eventos_incluidos_ids).toBe("epcot-food-wine");
    expect(r.details.eventos_ingresso_separado_ids).toBe("mnsshp");
    expect(r.details.festival_exige_epcot).toBe("Sim");
    expect(r.summary).not.toMatch(/sem ingresso diurno/);
  });
});

describe("viajantes", () => {
  it("99 e 10 no grupo 3–9 falham", () => {
    expect(validateTravelers({ tenPlus: 1, kids: 1, infants: 0, ages: ["99"] })).toMatch(/3 e 9/);
    expect(validateTravelers({ tenPlus: 1, kids: 1, infants: 0, ages: ["10"] })).toMatch(/3 e 9/);
  });
  it("8 no grupo menor de 3 falha", () => expect(validateTravelers({ tenPlus: 1, kids: 0, infants: 1, ages: ["8"] })).toMatch(/0 e 2/));
  it("não inteiro falha", () => expect(validateTravelers({ tenPlus: 1, kids: 1, infants: 0, ages: ["4.5"] })).toMatch(/inteiros/));
  it("faixas corretas passam", () => expect(validateTravelers({ tenPlus: 2, kids: 2, infants: 1, ages: ["3", "9", "0"] })).toBeNull());
});

describe("intenção × calendário", () => {
  it("dias de viagem inclusivos sem off-by-one", () => {
    expect(tripDaysInclusive("2027-03-10", "2027-03-11")).toBe(2);
    expect(tripDaysInclusive("2027-03-13", "2027-03-15")).toBe(3); // atravessa horário de verão dos EUA
    expect(tripDaysInclusive("2027-03-10", "2027-03-10")).toBe(1);
  });
  it("10 dias temáticos em viagem de 2 dias alerta", () => expect(validateThemeDays({ themes: ["epcot"], themeDays: 10, themeDaysHelp: false, periodMode: "dates", arrival: "2027-03-10", departure: "2027-03-11" })).toMatch(/2 dias/));
  it("pedir ajuda não bloqueia", () => expect(validateThemeDays({ themes: ["epcot"], themeDays: 10, themeDaysHelp: true, periodMode: "dates", arrival: "2027-03-10", departure: "2027-03-11" })).toBeNull());
  it("4 parques em 1 dia sem Hopper é incompatível", () => {
    const four = ["magic-kingdom", "epcot", "hollywood-studios", "animal-kingdom"];
    expect(validateHopperIntent({ themes: four, themeDays: 1, themeDaysHelp: false, hopper: "no" })).toMatch(/4 parques/);
    expect(validateHopperIntent({ themes: four, themeDays: 1, themeDaysHelp: false, hopper: "guidance" })).toBeNull();
    expect(validateHopperIntent({ themes: four, themeDays: 4, themeDaysHelp: false, hopper: "no" })).toBeNull();
  });
});

describe("hotéis", () => {
  it("31 hospedagens atuais com slugs reais resolvíveis", () => {
    const open = DISNEY_HOTELS.filter((h) => h.status === "open");
    expect(open).toHaveLength(31);
    for (const h of DISNEY_HOTELS) expect(getDisneyHotel(h.slug)?.slug).toBe(h.slug);
  });
  it("slug inventado não resolve", () => expect(getDisneyHotel("disneys-grand-floridian-resort-and-spa")).toBeNull());
});
