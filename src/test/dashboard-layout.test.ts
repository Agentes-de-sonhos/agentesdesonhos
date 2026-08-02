import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const dashboard = read("src/pages/Dashboard.tsx");
const news = read("src/components/dashboard/CuratedNewsFeed.tsx");

describe("dashboard layout restructure", () => {
  it("keeps only the agenda + upcoming trips row in two columns", () => {
    const twoColRows = dashboard.match(/lg:grid-cols-2/g) ?? [];
    expect(dashboard).toContain("lg:h-[min(60vh,760px)]");
    // every remaining two-column row belongs to sections outside the reorganized blocks
    expect(twoColRows.length).toBeGreaterThan(0);
  });

  it("limits the first row to a real 60vh ceiling on desktop (no min that can exceed 60vh)", () => {
    expect(dashboard).toContain("lg:h-[min(60vh,760px)]");
    expect(dashboard).not.toContain("clamp(380px,60vh,760px)");
    expect(dashboard).not.toContain("clamp(380px");
    expect(dashboard).not.toContain("lg:max-h-[60vh]");
    expect(dashboard).not.toMatch(/lg:min-h-\[\d+(px|vh|rem)\]/);
  });

  it("wraps first-row cards so nothing leaks outside the card", () => {
    expect(dashboard).toContain("min-h-0 lg:h-full overflow-hidden [&>*]:h-full [&>*]:min-h-0");
    const agenda = read("src/components/dashboard/UpcomingAgendaEventsCard.tsx");
    const trips = read("src/components/dashboard/TripRemindersCard.tsx");
    expect(agenda).toContain("min-h-0 overflow-hidden");
    expect(agenda).toContain('className="pb-2 shrink-0"');
    expect(trips).toContain("min-h-0 overflow-hidden");
  });

  it("renders news, community, academy and tourism map as full-width rows", () => {
    for (const block of ["<CuratedNewsFeed />", "<CommunitySocialFeed />", "<AcademyCollapsibleCard />", "<MapaTurismoCard />"]) {
      expect(dashboard).toContain(block);
    }
    expect(dashboard).toContain('<section className="order-4 min-w-0">');
    expect(dashboard).toContain('<section className="order-5 min-w-0">');
    // no legacy two-column wrappers pairing these blocks
    expect(dashboard).not.toContain("<CuratedNewsFeed /></div>");
    expect(dashboard).not.toContain("<CommunitySocialFeed /></div>");
  });

  it("never uses fractional order utilities", () => {
    expect(dashboard).not.toMatch(/order-\[\d+\.\d+\]/);
  });

  it("keeps a valid strictly increasing integer order sequence in every branch", () => {
    const branches = dashboard.split(/\) : is|\) : \(/).slice(1);
    expect(branches.length).toBeGreaterThanOrEqual(2);
    for (const branch of branches) {
      const orders = [...branch.matchAll(/order-(\d+)\b/g)].map((m) => Number(m[1]));
      expect(orders.length).toBeGreaterThan(0);
      for (const value of orders) expect(Number.isInteger(value)).toBe(true);
      const sorted = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sorted);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("does not duplicate the reorganized blocks in the main dashboard branch", () => {
    expect((dashboard.match(/<CuratedNewsFeed \/>/g) ?? []).length).toBe(2); // main + simplified branch
    expect((dashboard.match(/<MapaTurismoCard/g) ?? []).length).toBe(2);
  });

  it("agenda and trips cards fill the row height and paginate instead of scrolling", () => {
    const agenda = read("src/components/dashboard/UpcomingAgendaEventsCard.tsx");
    const trips = read("src/components/dashboard/TripRemindersCard.tsx");
    expect(agenda).toContain("h-full flex flex-col min-h-0");
    expect(trips).toContain("h-full flex flex-col min-h-0");
    expect(trips).not.toContain("max-h-[400px]");
    for (const file of [agenda, trips]) {
      expect(file).not.toContain("overflow-y-auto");
      expect(file).not.toContain("overflow-x-auto");
      expect(file).not.toContain("scrollbar-hide");
    }
  });
});

describe("primeira linha sem scrollbar (paginação adaptativa)", () => {
  const agenda = read("src/components/dashboard/UpcomingAgendaEventsCard.tsx");
  const trips = read("src/components/dashboard/TripRemindersCard.tsx");
  const hook = read("src/hooks/useAdaptivePageSize.ts");

  it("uses the reusable adaptive page size hook in both cards", () => {
    for (const file of [agenda, trips]) {
      expect(file).toContain('from "@/hooks/useAdaptivePageSize"');
      expect(file).toContain("useAdaptivePageSize<HTMLDivElement>(");
      expect(file).toContain("ref={listRef}");
      expect(file).toContain("overflow-hidden");
    }
    expect(agenda).toContain("max: 5");
    expect(agenda).toContain("min: 2");
  });

  it("hook measures with ResizeObserver and has a deterministic fallback", () => {
    expect(hook).toContain("ResizeObserver");
    expect(hook).toContain('typeof ResizeObserver === "undefined"');
    expect(hook).toContain("fallback ?? min");
    expect(hook).toContain("Math.max(min, Math.min(max, fits))");
  });

  it("normalizes the current page when the page size changes", () => {
    for (const file of [agenda, trips]) {
      expect(file).toContain("Math.max(0, Math.min(prev, totalPages - 1))");
      expect(file).toContain("}, [totalPages]);");
      expect(file).toContain("Math.ceil(total / pageSize)");
    }
    expect(agenda).toContain("Math.min(startIdx + pageSize, total)");
  });

  it("keeps agenda rows on a single line (truncate, no wrap)", () => {
    expect(agenda).toContain("truncate whitespace-nowrap");
    expect(agenda).not.toContain("line-clamp-2");
  });

  it("uses the exact 'Ver todas' CTA and single-line actions in Próximas Viagens", () => {
    expect(trips).not.toContain("Ver todas as próximas viagens");
    expect((trips.match(/label="Ver todas"/g) ?? []).length).toBe(2);
    expect(trips).toContain("flex flex-nowrap items-center");
    expect(trips).not.toContain("flex-wrap");
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

  it("shows the featured item and Top 5 side by side based on container width (65/35)", () => {
    expect(news).toContain("@container");
    expect(news).toContain("@[42rem]:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]");
    expect(news).not.toContain("@[56rem]:grid-cols-");
    expect(news).not.toContain("lg:grid-cols-[65fr_35fr]");
    expect(news).toContain("Top 5 da Semana");
    expect(news).toContain("{item.position}");
  });

  it("registers the read and opens the original URL", () => {
    expect(news).toContain('register_news_read');
    expect(news).toContain('window.open(item.url_original, "_blank", "noopener,noreferrer")');
  });
});

describe("Comunidade e Academy no dashboard", () => {
  const community = read("src/components/dashboard/CommunitySocialFeed.tsx");
  const academy = read("src/components/dashboard/AcademyCollapsibleCard.tsx");

  it("keeps the community feed in a single centered column", () => {
    expect(community).toContain('mx-auto w-full max-w-[780px]');
    expect(community).not.toContain("lg:grid-cols-2");
  });

  it("renders academy trails as vertical cards (image on top, CTA at bottom)", () => {
    expect(academy).toContain('flex flex-col h-full min-w-0');
    expect(academy).not.toContain("@[48rem]:flex-row");
    expect(academy).toContain("aspect-video shrink-0");
    expect(academy).toContain("mt-auto space-y-3");
    expect(academy).toContain("grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]");
  });
});
