import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const container = read("src/components/dashboard/DashboardContainer.tsx");
const dashboard = read("src/pages/Dashboard.tsx");
const layout = read("src/components/layout/DashboardLayout.tsx");

describe("dashboard centered container", () => {
  it("caps content width at 1560px and centers it with fluid gutters", () => {
    expect(container).toContain("mx-auto");
    expect(container).toContain("w-[calc(100%_-_clamp(32px,4vw,80px))]");
    expect(container).toContain("max-w-[1560px]");
    // the previous expression was not valid CSS (subtraction without calc())
    expect(container).not.toContain("w-[min(100%-clamp(16px,4vw,80px),1560px)]");
    expect(container).not.toMatch(/100%-clamp/);
    expect(container).toContain("@container");
    // no app-wide scaling tricks
    expect(container).not.toMatch(/scale-|zoom/);
  });

  it("is used by the Dashboard page wrapping every render branch", () => {
    expect(dashboard).toContain('from "@/components/dashboard/DashboardContainer"');
    expect((dashboard.match(/<DashboardContainer/g) ?? []).length).toBe(1);
    expect((dashboard.match(/<\/DashboardContainer>/g) ?? []).length).toBe(1);
    // container wraps loading, simplified, team-member and full branches
    const start = dashboard.indexOf("<DashboardContainer");
    const end = dashboard.indexOf("</DashboardContainer>");
    const inner = dashboard.slice(start, end);
    for (const marker of ["isLoading ?", "isTeamMember ?", "isSimplifiedDashboard ?", "<CuratedNewsFeed />"]) {
      expect(inner).toContain(marker);
    }
  });

  it("avoids double gutters by flushing the shell padding on the dashboard only", () => {
    expect(dashboard).toContain("<DashboardLayout flushHorizontal>");
    expect(layout).toContain("flushHorizontal");
    expect(layout).toContain('"py-4 sm:py-6 px-0 flex-1 pb-20 lg:pb-4 min-w-0"');
    // default (non-dashboard) padding preserved for every other page
    expect(layout).toContain("py-4 px-4 sm:py-6 sm:px-6 lg:pl-6 lg:pr-6 xl:pl-12 xl:pr-12");
  });

  it("does not apply the max width globally to other routes", () => {
    expect(layout).not.toContain("1560px");
    for (const file of ["src/pages/CRM.tsx", "src/pages/Vendas.tsx"]) {
      expect(read(file)).not.toContain("DashboardContainer");
    }
  });

  it("prevents horizontal overflow and keeps sidebar behavior untouched", () => {
    expect(layout).toContain("overflow-x-hidden");
    expect(layout).toContain("pl-0 lg:pl-16");
    expect(dashboard).toContain("overflow-x-hidden");
  });
});

describe("inner sections keep their approved rules", () => {
  it("agenda + trips stay side by side with equal heights and 5 desktop items", () => {
    expect(dashboard).toContain("lg:grid-cols-2");
    expect(dashboard).not.toContain("lg:max-h-[820px]");
    expect(dashboard).toContain("items-stretch");
    const agenda = read("src/components/dashboard/UpcomingAgendaEventsCard.tsx");
    expect(agenda).toContain("DESKTOP_PAGE_SIZE = 5");
  });

  it("news keeps the 50/50 split", () => {
    const news = read("src/components/dashboard/CuratedNewsFeed.tsx");
    expect(news).toContain("@[42rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]");
  });

  it("community feed stays a controlled reading column", () => {
    expect(read("src/components/dashboard/CommunitySocialFeed.tsx")).toContain("max-w-[780px]");
  });

  it("academy shows at most four cards per row via container queries", () => {
    const academy = read("src/components/dashboard/AcademyCollapsibleCard.tsx");
    expect(academy).toContain("@[72rem]:grid-cols-4");
    expect(academy).not.toContain("@[90rem]:grid-cols-5");
    expect(academy).not.toContain("repeat(auto-fit,minmax(min(100%,260px),1fr))");
  });

  it("tourism map buttons keep fixed dimensions instead of stretching", () => {
    const mapa = read("src/components/dashboard/start/MapaTurismoCard.tsx");
    expect(mapa).toContain("w-[92px] h-[92px] sm:w-[104px] sm:h-[104px]");
    expect(mapa).toContain("shrink-0");
  });
});