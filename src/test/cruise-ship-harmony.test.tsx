import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/lib/cruiseShips/harmonyAssets", () => ({ HARMONY_ASSETS: { caribbean: "/geo.json" } }));
vi.mock("leaflet", () => ({ default: null }));
vi.mock("leaflet/dist/leaflet.css", () => ({}));
const submit = vi.fn();
vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ state: "idle", error: null, submit, reset: vi.fn() }),
}));

import { HARMONY_OF_THE_SEAS as ship } from "@/lib/cruiseShips/harmonyOfTheSeas";
import { buildItineraryGroups, eligibleSailings } from "@/lib/cruiseShips/itineraryGroups";
import { cruiseQuotePayload, validCruiseQuote } from "@/lib/cruiseShips/quoteRequest";
import { findCruiseShip } from "@/lib/cruiseShips";
import CruiseShipRoutePage from "@/pages/whitelabel/CruiseShipRoutePage";

const groups = buildItineraryGroups(ship.routes.feed.sailings, ship.routes);
const all = groups.flatMap((g) => g.variants.flatMap((v) => v.sailings.map((s) => s.date)));

describe("Harmony itinerary grouping", () => {
  it("keeps the 68 observed sailings and withholds only the two conflicts", () => {
    expect(ship.routes.feed.sailings).toHaveLength(68);
    expect(eligibleSailings(ship.routes.feed.sailings)).toHaveLength(66);
    expect(all).not.toContain("2027-06-12");
    expect(all).not.toContain("2027-12-30");
    expect(all).toContain("2027-04-10"); // official_checked is shown
  });
  it("groups by nights + port set, preserving each port order as a variant with its own dates", () => {
    for (const g of groups) {
      const sets = new Set(g.variants.map((v) => [...new Set(v.ports.slice(1, -1))].sort().join("|")));
      expect(sets.size).toBe(1);
      expect(new Set(g.variants.map((v) => v.ports.join("|"))).size).toBe(g.variants.length);
      g.variants.forEach((v) => v.sailings.forEach((s) => { expect(s.n).toBe(g.n); expect(s.ports).toEqual(v.ports); }));
    }
    expect(new Set(groups.map((g) => g.region))).toEqual(new Set(["Bahamas", "Caribe Oriental", "Caribe Ocidental"]));
  });
});

describe("Harmony quote payload", () => {
  const form = { name: "Maria Souza", phone: "(48) 99999-0000", email: "", period: "2027-04", adults: 2, children: 1, ages: "7", cabin: "Varanda", consent: true };
  it("requires consent, valid WhatsApp and children ages", () => {
    expect(validCruiseQuote(form)).toBe(true);
    expect(validCruiseQuote({ ...form, consent: false })).toBe(false);
    expect(validCruiseQuote({ ...form, phone: "123" })).toBe(false);
    expect(validCruiseQuote({ ...form, ages: "" })).toBe(false);
    expect(validCruiseQuote({ ...form, children: 2, ages: "5," })).toBe(false);
    expect(validCruiseQuote({ ...form, children: 2, ages: "0,9" })).toBe(true);
    expect(validCruiseQuote({ ...form, ages: "18" })).toBe(false);
  });
  it("sends a cruise request with ship, line, exact order, date, nights, cabin and passengers", () => {
    const g = groups.find((x) => x.variants.some((v) => v.sailings.some((s) => s.date === "2027-04-10")))!;
    const vi_ = g.variants.findIndex((v) => v.sailings.some((s) => s.date === "2027-04-10"));
    const p = cruiseQuotePayload(ship, { group: g, variantIndex: vi_, date: "2027-04-10" }, form, "");
    expect(p.service_key).toBe("cruzeiros");
    expect(p.summary).toContain("Harmony of the Seas · Royal Caribbean International");
    expect(p.summary).toContain("Port Canaveral → Costa Maya → Cozumel → Nassau → CocoCay → Port Canaveral");
    expect(p.summary).toContain("Saída selecionada: 10/04/2027");
    expect(p.details).toMatchObject({ noites: 7, cabine: "Varanda", adultos: 2, criancas: 1, idades_criancas: "7", data_saida: "2027-04-10" });
    expect(p).not.toHaveProperty("agency_id");
  });
});

describe("Harmony route page", () => {
  beforeEach(() => submit.mockReset());
  const renderAt = (path: string) => render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/cruzeiros/:line/:ship" element={<CruiseShipRoutePage info={{ hostname: "paraisoviagens.com", agency_name: "Paraíso" } as never} />} /></Routes>
    </MemoryRouter>,
  );

  it("resolves the registry and renders the approved structure", () => {
    expect(findCruiseShip("royal-caribbean", "harmony-of-the-seas")).toBe(ship);
    renderAt("/cruzeiros/royal-caribbean/harmony-of-the-seas");
    const nav = screen.getByRole("navigation", { name: "Seções" });
    ["O navio", "Experiências", "Cabines", "Roteiros", "Solicitar orçamento ↗"].forEach((t) => expect(within(nav).getByText(t)).toBeInTheDocument());
    expect(screen.getByText(ship.credit)).toBeInTheDocument();
    expect(screen.getByText("Não é inventário completo nem consulta de disponibilidade em tempo real.")).toBeInTheDocument();
    expect(screen.getByText(/Ver todas as 18 fotos/)).toBeInTheDocument();
    expect(screen.queryByText(/DEMONSTRATIVO|Simular/i)).toBeNull();
    expect(document.querySelectorAll('a[href^="http"]')).toHaveLength(0);
  });

  it("unknown ship shows unavailable page", () => {
    renderAt("/cruzeiros/royal-caribbean/inexistente");
    expect(screen.getByText("Página indisponível")).toBeInTheDocument();
  });

  it("submits once through the existing site-request hook with the route chosen on the map", async () => {
    submit.mockResolvedValue({ success: true });
    renderAt("/cruzeiros/royal-caribbean/harmony-of-the-seas");
    fireEvent.click(screen.getByRole("button", { name: "Quero orçamento deste roteiro" }));
    fireEvent.change(screen.getByPlaceholderText("Como podemos chamar você?"), { target: { value: "Maria Souza" } });
    fireEvent.change(screen.getByPlaceholderText("DDD + número"), { target: { value: "48999990000" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Concordo com o envio/ }));
    const btn = screen.getByRole("button", { name: "Solicite o seu orçamento" });
    fireEvent.click(btn); fireEvent.click(btn);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    const payload = submit.mock.calls[0][0];
    expect(payload.service_key).toBe("cruzeiros");
    expect(payload.details.regiao).toBe("Bahamas");
    expect(payload.details.ordem_escalas).toMatch(/^Port Canaveral → /);
  });
});
