import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { filterUpcomingTrips } from "@/pages/ProximasViagens";

const read = (p: string) => readFileSync(p, "utf8");

describe("dashboard block CTAs", () => {
  it("agenda block links to the agenda page in the header", () => {
    const src = read("src/components/dashboard/UpcomingAgendaEventsCard.tsx");
    expect(src).toContain('to="/agenda"');
    expect(src).toContain("Ver toda a agenda");
  });

  it("upcoming trips block links to the dedicated page", () => {
    const src = read("src/components/dashboard/TripRemindersCard.tsx");
    expect(src).toContain('to="/proximas-viagens"');
    expect(src).toContain("Ver todas as próximas viagens");
  });

  it("news block links to the news hub and dropped the footer CTA", () => {
    const src = read("src/components/dashboard/CuratedNewsFeed.tsx");
    expect(src).toContain('to="/noticias"');
    expect(src).toContain("Ver todas as notícias");
    expect(src).not.toContain("Mais notícias");
    // individual news still open externally
    expect(src).toContain('target="_blank"');
    expect(src).toContain('rel="noopener noreferrer"');
  });

  it("tourism map block links to the directory root", () => {
    const src = read("src/components/dashboard/start/MapaTurismoCard.tsx");
    expect(src).toContain("Ver Mapa do Turismo");
  });

  it("CTA links route through the internal window system", () => {
    const src = read("src/components/dashboard/SectionCtaLink.tsx");
    expect(src).toContain("data-workspace-menu");
    expect(src).toContain("data-workspace-title");
  });
});

const row = (over: Partial<any> = {}) => ({
  id: over.id ?? "r1",
  trip_id: over.trip_id ?? "t1",
  daysRemaining: over.daysRemaining ?? 5,
  days_before: over.days_before ?? 3,
  follow_up_note: null,
  trip: { client_name: "Ana Souza", destination: "Lisboa", start_date: "2026-09-01", end_date: "2026-09-10" },
  ...over,
});

describe("Próximas Viagens filtering", () => {
  const rows = [
    row({ id: "a", daysRemaining: 20 }),
    row({ id: "b", daysRemaining: 2 }),
    row({ id: "c", daysRemaining: 40, days_before: -1, trip: { client_name: "Bruno", destination: "Roma" } }),
  ] as any[];

  it("orders by nearest departure first", () => {
    const out = filterUpcomingTrips(rows, { search: "", period: "all", kind: "all" });
    expect(out.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("filters by period, kind and search", () => {
    expect(filterUpcomingTrips(rows, { search: "", period: "7", kind: "all" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterUpcomingTrips(rows, { search: "", period: "all", kind: "return" }).map((r) => r.id)).toEqual(["c"]);
    expect(filterUpcomingTrips(rows, { search: "roma", period: "all", kind: "all" }).map((r) => r.id)).toEqual(["c"]);
    expect(filterUpcomingTrips(rows, { search: "ana", period: "all", kind: "departure" }).map((r) => r.id)).toEqual(["b", "a"]);
  });
});
