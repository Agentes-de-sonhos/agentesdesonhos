import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { buildDisneyRequest, clampThemeDays, pruneIncompatible, recommendTicket, ticketPath, validatePeriod, validateTravelers, type DisneyPlan } from "@/lib/disneyTickets";
import { DISNEY_HOTELS, DISNEY_FUTURE_HOTELS, getDisneyHotel } from "@/components/landing/disney/disneyHotelsCatalog";
import { DISNEY_EVENTS, DISNEY_THEME_PARK_CARDS, DISNEY_WATER_PARK_CARDS } from "@/components/landing/disney/content";
import { isDisneyPreviewRouteEnabled } from "@/lib/disneyPreviewGate";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
import { useDisneyPreviewRequest } from "@/hooks/useDisneyPreviewRequest";
beforeEach(() => invoke.mockReset());

const base: DisneyPlan = { themes: ["magic-kingdom"], waters: [], events: [], periodMode: "months", arrival: "", departure: "", months: ["2027-07"], themeDays: 4, themeDaysHelp: false, hopper: null, waterVisits: null, lightningLane: false, hotelInterest: false, tenPlus: 2, kids: 0, infants: 0, ages: [], name: "Teste", whatsapp: "(11) 99999-9999", email: "" };

describe("ingressos Disney: quatro combinações", () => {
  const two = ["magic-kingdom", "epcot"];
  it("sem troca e sem extras → 1 parque por dia", () => expect(recommendTicket({ themes: two, waters: [], events: [], hopper: "no", waterExtras: "no" })).toBe("one_park_per_day"));
  it("com troca, sem extras → Park Hopper", () => expect(recommendTicket({ themes: two, waters: [], events: [], hopper: "yes", waterExtras: "no" })).toBe("park_hopper"));
  it("sem troca, com aquático → Water Park and Sports", () => expect(recommendTicket({ themes: two, waters: ["typhoon-lagoon"], events: [], hopper: "no", waterExtras: "yes" })).toBe("water_park_and_sports"));
  it("com troca e aquático → Park Hopper Plus", () => expect(recommendTicket({ themes: two, waters: ["blizzard-beach"], events: [], hopper: "yes", waterExtras: "yes" })).toBe("park_hopper_plus"));
  it("um único temático nunca recomenda Park Hopper", () => expect(recommendTicket({ themes: ["epcot"], waters: [], events: [], hopper: "yes", waterExtras: "no" })).toBe("one_park_per_day"));
  it("orientação quando o cliente pede ajuda", () => expect(recommendTicket({ themes: two, waters: [], events: [], hopper: "guidance", waterExtras: "no" })).toBe("guidance"));
});

describe("caminhos sem parque temático", () => {
  it("só aquático e só evento são aceitos", () => {
    expect(ticketPath([], ["typhoon-lagoon"], [])).toBe("water_only");
    expect(ticketPath([], [], ["mvmcp"])).toBe("event_only");
    expect(ticketPath([], [], [])).toBeNull();
  });
  it("payload só de evento não leva dias de temáticos", () => {
    const r = buildDisneyRequest({ ...base, themes: [], themeDays: 4, events: [{ id: "mvmcp", name: "Mickey's Very Merry Christmas Party" }] });
    expect(r.details.recomendacao).toBe("event_only");
    expect(r.details.dias_tematicos).toBe("");
  });
});

describe("regras de dias e período", () => {
  it("dias temáticos de 1 a 10 (sem limite Universal de 14)", () => { expect(clampThemeDays(0)).toBe(1); expect(clampThemeDays(10)).toBe(10); expect(clampThemeDays(14)).toBe(10); });
  it("valida datas e meses", () => {
    expect(validatePeriod("dates", "2026-12-10", "2026-12-01", [], "2026-10-20")).toMatch(/posterior/);
    expect(validatePeriod("months", "", "", [], "2026-10-20")).toMatch(/mês/);
    expect(validatePeriod("months", "", "", ["2027-01"], "2026-10-20")).toBeNull();
  });
  it("idade obrigatória para cada criança", () => {
    expect(validateTravelers({ tenPlus: 2, kids: 1, infants: 1, ages: ["5"] })).toMatch(/idade/);
    expect(validateTravelers({ tenPlus: 2, kids: 1, infants: 1, ages: ["5", "1"] })).toBeNull();
  });
  it("remove extras incompatíveis ao voltar", () => {
    const p = pruneIncompatible({ ...base, themes: ["epcot"], hopper: "yes", waters: [], waterVisits: 3, lightningLane: true });
    expect(p.hopper).toBeNull(); expect(p.waterVisits).toBeNull(); expect(p.lightningLane).toBe(true);
    const q = pruneIncompatible({ ...base, themes: [], lightningLane: true });
    expect(q.lightningLane).toBe(false); expect(q.themeDays).toBeNull();
  });
});

describe("catálogo Disney", () => {
  it("4 temáticos e 2 aquáticos separados", () => { expect(DISNEY_THEME_PARK_CARDS).toHaveLength(4); expect(DISNEY_WATER_PARK_CARDS).toHaveLength(2); });
  it("31 hospedagens atuais por categoria oficial, Lakeshore separado", () => {
    expect(DISNEY_HOTELS).toHaveLength(31);
    const c = (k: string) => DISNEY_HOTELS.filter((h) => h.category === k).length;
    expect([c("Econômica"), c("Moderada"), c("Deluxe"), c("Villas Deluxe"), c("Acampamento")]).toEqual([5, 4, 8, 13, 1]);
    expect(DISNEY_HOTELS.some((h) => h.slug === "lakeshore-lodge")).toBe(false);
    expect(DISNEY_FUTURE_HOTELS[0].status).toBe("future");
    expect(new Set(DISNEY_HOTELS.map((h) => h.slug)).size).toBe(31);
  });
  it("Cabins são Villas Deluxe; camping é camping; sem duplicata de Gran Destino/Island Tower", () => {
    expect(getDisneyHotel("cabins-fort-wilderness")?.category).toBe("Villas Deluxe");
    expect(getDisneyHotel("campsites-fort-wilderness")?.kind).toBe("camping");
    expect(DISNEY_HOTELS.some((h) => /Gran Destino|Island Tower/.test(h.name))).toBe(false);
  });
  it("cada página tem 3 parágrafos, fonte oficial e nenhuma nota inventada", () => {
    for (const h of DISNEY_HOTELS) {
      expect(h.paragraphs).toHaveLength(3);
      expect(h.sources.every((s) => /disney(world)?\.(disney\.go\.com|eu)/.test(s)), h.slug).toBe(true);
      expect("google" in h || "rating" in h || "photos" in h, h.slug).toBe(false);
    }
    expect(getDisneyHotel("inexistente")).toBeNull();
  });
  it("todo evento marca incluído ou separado; H2O Glow sem datas", () => {
    for (const e of DISNEY_EVENTS) expect(["included", "separate"]).toContain(e.ticket);
    expect(DISNEY_EVENTS.filter((e) => e.ticket === "included").every((e) => e.park === "EPCOT")).toBe(true);
    expect(DISNEY_EVENTS.find((e) => e.id === "h2o-glow")?.status).toBe("no_dates");
  });
});

describe("isolamento e prévia", () => {
  it("rota só para Destinos com a Ju em host técnico", () => {
    expect(isDisneyPreviewRouteEnabled("destinoscomaju.com.br", "localhost")).toBe(true);
    expect(isDisneyPreviewRouteEnabled("destinoscomaju.com.br", "id-preview--x.lovable.app")).toBe(true);
    expect(isDisneyPreviewRouteEnabled("destinoscomaju.com.br", "destinoscomaju.com.br")).toBe(false);
    for (const h of ["100limites.tur.br", "bardelliviagens.com.br", "omundoemcores.com.br", "casanovatur.com.br"]) expect(isDisneyPreviewRouteEnabled(h, "localhost")).toBe(false);
  });
  it("na prévia o envio é simulado e não chama o backend", async () => {
    const { result } = renderHook(() => useDisneyPreviewRequest("destinoscomaju.com.br"));
    expect(result.current.simulated).toBe(true);
    await act(async () => { expect(await result.current.submit(buildDisneyRequest(base))).toMatchObject({ success: true, simulated: true }); });
    expect(invoke).not.toHaveBeenCalled();
    expect(result.current.state).toBe("success");
  });
});
