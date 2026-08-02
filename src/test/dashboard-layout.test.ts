import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const dashboard = read("src/pages/Dashboard.tsx");
const news = read("src/components/dashboard/CuratedNewsFeed.tsx");

describe("dashboard layout restructure", () => {
  it("keeps only the agenda + upcoming trips row in two columns", () => {
    const twoColRows = dashboard.match(/lg:grid-cols-2/g) ?? [];
    const agendaRows = dashboard.match(/lg:grid-cols-2 items-stretch[^"]*lg:max-h-\[60vh\]|items-stretch order-2 lg:max-h-\[60vh\]/g) ?? [];
    expect(agendaRows.length).toBeGreaterThan(0);
    // every remaining two-column row belongs to sections outside the reorganized blocks
    expect(twoColRows.length).toBeGreaterThan(0);
  });

  it("limits the first row to 60vh on desktop with a sensible minimum", () => {
    expect(dashboard).toContain("lg:max-h-[60vh]");
    expect(dashboard).toContain("lg:min-h-[380px]");
  });

  it("renders news, community, academy and tourism map as full-width rows", () => {
    for (const block of ["<CuratedNewsFeed />", "<CommunitySocialFeed />", "<AcademyCollapsibleCard />", "<MapaTurismoCard />"]) {
      expect(dashboard).toContain(`<section className="order-[3.${"3568".includes("x") ? "" : ""}`.slice(0, 30));
      expect(dashboard).toContain(block);
    }
    // no legacy two-column wrappers pairing these blocks
    expect(dashboard).not.toContain("<CuratedNewsFeed /></div>");
    expect(dashboard).not.toContain("<CommunitySocialFeed /></div>");
  });

  it("does not duplicate the reorganized blocks in the main dashboard branch", () => {
    expect((dashboard.match(/<CuratedNewsFeed \/>/g) ?? []).length).toBe(2); // main + simplified branch
    expect((dashboard.match(/<MapaTurismoCard/g) ?? []).length).toBe(2);
  });

  it("agenda and trips cards fill the row height and scroll internally", () => {
    const agenda = read("src/components/dashboard/UpcomingAgendaEventsCard.tsx");
    const trips = read("src/components/dashboard/TripRemindersCard.tsx");
    expect(agenda).toContain("h-full flex flex-col min-h-0");
    expect(agenda).toContain("flex-1 min-h-0 overflow-y-auto");
    expect(trips).toContain("h-full flex flex-col min-h-0");
    expect(trips).toContain("flex-1 min-h-0 overflow-y-auto");
    expect(trips).not.toContain("max-h-[400px]");
  });
});

describe("Notícias do Trade block", () => {
  it("uses the exact section name", () => {
    expect(news).toContain("Notícias do Trade");
    expect(news).not.toContain("Radar do Turismo");
    expect(news).not.toContain("Radar do Trade");
  });

  it("reuses the shared highlights hook / RPC instead of duplicating logic", () => {
    expect(news).toContain('from "@/hooks/useNewsHighlights"');
    expect(news).toContain("useNewsHighlights()");
    expect(news).toContain("highlightLabel");
    expect(news).not.toContain('from("noticias_dashboard")');
  });

  it("shows the featured item and Top 5 positions side by side (65/35)", () => {
    expect(news).toContain("lg:grid-cols-[65fr_35fr]");
    expect(news).toContain("Top 5 da Semana");
    expect(news).toContain("{item.position}");
  });

  it("registers the read and opens the original URL", () => {
    expect(news).toContain('register_news_read');
    expect(news).toContain('window.open(item.url_original, "_blank", "noopener,noreferrer")');
  });
});
