import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const dashboard = read("src/pages/Dashboard.tsx");
const news = read("src/components/dashboard/CuratedNewsFeed.tsx");

describe("dashboard layout restructure", () => {
  it("keeps only the agenda + upcoming trips row in two columns", () => {
    const twoColRows = dashboard.match(/lg:grid-cols-2/g) ?? [];
    expect(dashboard).not.toContain("lg:h-[max(60vh,560px)]");
    // every remaining two-column row belongs to sections outside the reorganized blocks
    expect(twoColRows.length).toBeGreaterThan(0);
  });

  it("gives the first row enough height for 5 agenda rows without inner overflow", () => {
    expect(dashboard).not.toContain("lg:max-h-[820px]");
    expect(dashboard).not.toContain("60vh");
    expect(dashboard).not.toContain("560px");
    expect(dashboard).toContain("items-stretch");
    expect(dashboard).not.toContain("clamp(380px,60vh,760px)");
    expect(dashboard).not.toContain("clamp(380px");
    expect(dashboard).not.toContain("lg:max-h-[60vh]");
  });

  it("wraps first-row cards so nothing leaks outside the card", () => {
    expect(dashboard).toContain("h-full min-h-0 min-w-0 flex-col [&>*]:h-full [&>*]:min-h-0");
    const agenda = read("src/components/dashboard/UpcomingAgendaEventsCard.tsx");
    const trips = read("src/components/dashboard/TripRemindersCard.tsx");
    expect(agenda).toContain("min-h-0 overflow-hidden");
    expect(agenda).toContain('className="pb-2 shrink-0"');
    expect(trips).toContain("min-h-0 overflow-hidden");
  });

  it("renders only community as a full-width row after agenda and trips", () => {
    expect(dashboard).toContain("<CommunitySocialFeed />");
    for (const block of ["<CuratedNewsFeed />", "<AcademyCollapsibleCard />", "<MapaTurismoCard />"]) {
      expect(dashboard).not.toContain(block);
    }
    expect(dashboard).toContain('data-dashboard-section="community"');
  });

  it("never uses fractional order utilities", () => {
    expect(dashboard).not.toMatch(/order-\[\d+\.\d+\]/);
  });

  it("uses source order instead of CSS order branches", () => {
    expect(dashboard).not.toMatch(/order-\d+\b/);
  });

  it("does not duplicate the three dashboard blocks", () => {
    expect((dashboard.match(/<UpcomingAgendaEventsCard \/>/g) ?? []).length).toBe(1);
    expect((dashboard.match(/<TripRemindersCard \/>/g) ?? []).length).toBe(1);
    expect((dashboard.match(/<CommunitySocialFeed \/>/g) ?? []).length).toBe(1);
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
    // desktop is fixed at 5 and skips the observer entirely
    expect(agenda).toContain('from "@/hooks/useIsDesktop"');
    expect(agenda).toContain("DESKTOP_PAGE_SIZE = 5");
    expect(agenda).toContain("isDesktop ? DESKTOP_PAGE_SIZE : adaptivePageSize");
    expect(agenda).toContain("enabled: !isDesktop");
    expect(trips).toContain('from "@/hooks/useIsDesktop"');
    expect(trips).toContain("DESKTOP_PAGE_SIZE = 3");
    expect(trips).toContain("isDesktop ? DESKTOP_PAGE_SIZE : adaptivePageSize");
    expect(trips).toContain("enabled: !isDesktop");
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

  it("keeps both footers on a single compact line (counter left, pagination right)", () => {
    for (const file of [agenda, trips]) {
      expect(file).toContain("mt-auto pt-1.5 border-t flex flex-row flex-nowrap items-center justify-between gap-2 shrink-0");
      expect(file).not.toMatch(/ref=\{listRef\} className="[^"]*flex-1/);
      expect(file).not.toContain("@[26rem]:flex-row items-center justify-between");
      expect(file).toContain("Mostrando <span");
    }
  });

  it("keeps the greeting compact and currencies visible from tablet widths", () => {
    const pill = read("src/components/layout/GamificationPill.tsx");
    const fx = read("src/components/dashboard/ExchangeRateCard.tsx");
    expect(dashboard).toContain("flex min-w-0 flex-wrap items-center gap-3");
    expect(dashboard).toContain("whitespace-nowrap truncate min-w-0");
    expect(dashboard).toContain("hidden md:flex md:flex-nowrap md:items-center");
    expect(pill).toContain("whitespace-nowrap shrink-0");
    expect(fx).toContain("flex flex-nowrap items-center");
    expect((fx.match(/whitespace-nowrap/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("halves the main content side padding on smaller desktops", () => {
    const layout = read("src/components/layout/DashboardLayout.tsx");
    expect(layout).toContain("lg:pl-6 lg:pr-6 xl:pl-12 xl:pr-12");
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

  it("splits the featured item and Top 5 exactly 50/50 from the smaller desktop up", () => {
    expect(news).toContain("@container");
    expect(news).toContain("@[42rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]");
    expect(news).not.toContain("62fr");
    expect(news).not.toContain("lg:grid-cols-[65fr_35fr]");
    expect(news).toContain("Top 5 da Semana");
    expect(news).toContain("{item.position}");
    expect(news).toContain("items-stretch");
  });

  it("renders Top 5 as a single soft-bordered card with light rows", () => {
    expect(news).toContain("border border-[hsl(var(--section-news)/0.28)]");
    expect(news).toContain("bg-gradient-to-b from-[hsl(var(--section-news)/0.06)] to-card");
    expect(news).toContain("rounded-xl");
    expect(news).toContain("divide-y divide-[hsl(var(--section-news)/0.14)]");
    expect(news).toContain("<Trophy");
    // rows stay light: no per-item border/shadow card
    expect(news).not.toContain("border-b border-border/50");
    expect(news).not.toContain("shadow-md hover:shadow-lg\" ");
  });

  it("uses the new inviting intro copy", () => {
    expect(news).toContain("Fique por dentro das principais notícias do turismo em um só lugar.");
    expect(news).not.toContain("O destaque do período e o Top 5 da semana, com a mesma curadoria da página completa.");
  });

  it("registers the read and opens the original URL", () => {
    expect(news).toContain('register_news_read');
    expect(news).toContain('window.open(item.url_original, "_blank", "noopener,noreferrer")');
  });
});

describe("Comunidade e Academy no dashboard", () => {
  const community = read("src/components/dashboard/CommunitySocialFeed.tsx");
  const academy = read("src/components/dashboard/AcademyCollapsibleCard.tsx");

  it("keeps the community feed in one wide, left-aligned responsive column", () => {
    expect(community).toContain('w-full min-w-0 space-y-4 lg:w-[88%] xl:w-[78%]');
    expect(community).not.toContain('className="mx-auto w-full');
    expect(community).not.toContain("lg:grid-cols-2");
  });

  it("renders academy trails as vertical cards (image on top, CTA at bottom)", () => {
    expect(academy).toContain('flex flex-col h-full min-w-0');
    expect(academy).not.toContain("@[48rem]:flex-row");
    expect(academy).toContain("aspect-video shrink-0");
    expect(academy).toContain("mt-auto space-y-3");
    expect(academy).toContain("@[72rem]:basis-[23%]");
  });
});

describe("Notícias do Trade — destaque e Top 5 refinados", () => {
  const news = read("src/components/dashboard/CuratedNewsFeed.tsx");

  it("limits featured title and summary to two lines with ellipsis", () => {
    expect(news).toMatch(/<h3[^>]*line-clamp-2[^>]*>\s*\{featured\.titulo_curto\}/);
    expect(news).toMatch(/<p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">\{featured\.resumo\}<\/p>/);
    expect(news).not.toContain("line-clamp-3");
  });

  it("does not fake the clamp with fixed heights", () => {
    expect(news).not.toMatch(/h-\[\d+px\]/);
  });

  it("removes the decorative blue rule from the Top 5 header", () => {
    expect(news).not.toContain('<span className="ml-2 h-1 flex-1 rounded-full bg-[hsl(var(--section-news)/0.25)]" />');
    expect(news).not.toMatch(/h-1 flex-1 rounded-full/);
  });

  it("keeps the trophy icon and Top 5 title", () => {
    expect(news).toContain("<Trophy");
    expect(news).toContain("Top 5 da Semana");
    expect(news).toContain('className="flex items-center gap-2 pb-2 min-w-0"');
  });
});
