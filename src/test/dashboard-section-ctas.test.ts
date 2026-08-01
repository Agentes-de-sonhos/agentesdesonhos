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

const trip = (over: Partial<any> = {}) => ({
  id: over.id ?? "t1",
  client_name: "Ana Souza",
  trip_title: "Lua de mel",
  destination: "Lisboa",
  start_date: over.start_date ?? "2026-09-01",
  end_date: over.end_date ?? "2026-09-10",
  status: over.status ?? "active",
  daysRemaining: over.daysRemaining ?? 5,
  inProgress: over.inProgress ?? false,
  reminderId: over.reminderId ?? null,
  followUpNote: over.followUpNote ?? null,
  ...over,
});

describe("Próximas Viagens — uma viagem = um item", () => {
  it("orders by nearest start_date first", () => {
    const out = filterUpcomingTrips(
      [
        trip({ id: "a", start_date: "2026-10-01", daysRemaining: 30 }),
        trip({ id: "b", start_date: "2026-08-10", daysRemaining: 2 }),
        trip({ id: "c", start_date: "2026-09-01", daysRemaining: 10 }),
      ] as any[],
      { search: "", period: "all", status: "all" },
    );
    expect(out.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("keeps a future trip that has no reminder at all", () => {
    const out = filterUpcomingTrips([trip({ id: "no-rem", reminderId: null })] as any[], {
      search: "", period: "all", status: "all",
    });
    expect(out).toHaveLength(1);
    expect(out[0].reminderId).toBeNull();
  });

  it("never duplicates a trip and hides follow-up when no reminder exists", () => {
    const src = read("src/hooks/useUpcomingTrips.ts");
    // one row per trip comes from querying trips (not trip_reminders)
    expect(src).toContain('.from("trips")');
    expect(src).toContain("byTrip.set");
    const page = read("src/pages/ProximasViagens.tsx");
    expect(page).toContain("{trip.reminderId && (");
    // no incorrect "conclude the trip" action bound to a reminder RPC
    expect(page).not.toContain("markCompleted");
  });

  it("does not depend on reminder completion state", () => {
    const src = read("src/hooks/useUpcomingTrips.ts");
    expect(src).not.toContain("is_completed");
  });

  it("excludes cancelled/archived trips and scopes by user_id (RLS)", () => {
    const src = read("src/hooks/useUpcomingTrips.ts");
    expect(src).toContain("EXCLUDED_STATUSES");
    expect(src).toContain('"archived"');
    expect(src).toContain('"cancelado"');
    expect(src).toContain('.eq("user_id", user.id)');
  });

  it("filters by period and real trip situation", () => {
    const rows = [trip({ id: "x", daysRemaining: 40 }), trip({ id: "y", daysRemaining: 3 }), trip({ id: "z", daysRemaining: -2, inProgress: true })] as any[];
    expect(filterUpcomingTrips(rows, { search: "", period: "7", status: "all" }).map((t) => t.id)).toEqual(["y", "z"]);
    expect(filterUpcomingTrips(rows, { search: "", period: "all", status: "in_progress" }).map((t) => t.id)).toEqual(["z"]);
    expect(filterUpcomingTrips(rows, { search: "", period: "all", status: "future" }).map((t) => t.id)).toHaveLength(2);
  });

  it("searches client, trip title and destination", () => {
    const rows = [trip({ id: "a" }), trip({ id: "b", client_name: "Bruno", trip_title: null, destination: "Roma" })] as any[];
    expect(filterUpcomingTrips(rows, { search: "lua de mel", period: "all", status: "all" }).map((t) => t.id)).toEqual(["a"]);
    expect(filterUpcomingTrips(rows, { search: "roma", period: "all", status: "all" }).map((t) => t.id)).toEqual(["b"]);
    expect(filterUpcomingTrips(rows, { search: "ana", period: "all", status: "all" }).map((t) => t.id)).toEqual(["a"]);
  });
});
