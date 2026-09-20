import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AGENTES_DASHBOARD_ACTIONS } from "@/components/dashboard/DashboardQuickActions";
import { buildCommunityFeedPage, mergeUniqueCommunityPages } from "@/lib/communityFeedPagination";
import type { CommunityPost } from "@/types/community-members";

const read = (path: string) => readFileSync(path, "utf8");
const dashboard = read("src/pages/Dashboard.tsx");
const feed = read("src/components/dashboard/CommunitySocialFeed.tsx");
const hook = read("src/hooks/useCommunityFeed.ts");
const siteLabDashboard = read("src/pages/whitelabel/admin/AgencyAdminHome.tsx");

const post = (id: string): CommunityPost => ({
  id,
  user_id: `user-${id}`,
  content: id,
  tags: [],
  is_pinned: false,
  likes_count: 0,
  comments_count: 0,
  created_at: "2026-09-20T00:00:00Z",
  updated_at: "2026-09-20T00:00:00Z",
});

describe("dashboard exclusivo do Agentes de Sonhos", () => {
  it("mantém somente Agenda, Próximas Viagens e Comunidade, nesta ordem", () => {
    const agenda = dashboard.indexOf("<UpcomingAgendaEventsCard />");
    const trips = dashboard.indexOf("<TripRemindersCard />");
    const community = dashboard.indexOf("<CommunitySocialFeed />");
    expect(agenda).toBeGreaterThan(-1);
    expect(trips).toBeGreaterThan(agenda);
    expect(community).toBeGreaterThan(trips);
    for (const removed of [
      "DashboardBanner", "LeadsAwaitingCard", "CuratedNewsFeed", "AcademyCollapsibleCard",
      "MapaTurismoCard", "ClientesCard", "FinanceiroCard", "MarketingCard",
      "AgentToolsCard", "SalesResourcesCard", "GuidesReferencesCard",
    ]) expect(dashboard).not.toContain(removed);
  });

  it("mantém os quatro atalhos na ordem e com guards de permissão e plano", () => {
    expect(AGENTES_DASHBOARD_ACTIONS.map(({ label }) => label)).toEqual([
      "Criar cliente", "Criar orçamento", "Criar roteiro", "Criar carteira digital",
    ]);
    expect(AGENTES_DASHBOARD_ACTIONS.map(({ permission }) => permission)).toEqual([
      "clients.create", "quotes.create", "itineraries.create", "wallet.create",
    ]);
    const shortcuts = read("src/components/dashboard/DashboardQuickActions.tsx");
    expect(shortcuts).toContain("can(action.permission)");
    expect(shortcuts).toContain("hasFeature(action.feature)");
    expect(shortcuts).toContain("useOpenInternalWindow");
  });

  it("preserva saudação e controles, ocultando o câmbio somente no mobile", () => {
    expect(dashboard).toContain("{getGreeting()}, {firstName}!");
    expect(dashboard).toContain("<ExchangeRateCard />");
    expect(dashboard).toContain("hidden md:flex");
    expect(dashboard).toContain("<NotificationsDropdown />");
    expect(dashboard).toContain('openInternalWindow("/perfil", "Meu perfil")');
    expect(dashboard).toContain("onClick={handleLogout}");
    expect(dashboard).toContain("data-dashboard-mobile-header");
    expect(dashboard).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(dashboard).toContain("col-start-1 row-start-1 min-w-0");
    expect(dashboard).toContain("col-span-2 row-start-2");
    expect(dashboard).toContain("col-start-2 row-start-1 flex shrink-0");
    expect(dashboard).not.toContain("<OnlineAgentsStrip");
    expect(feed).toContain("<OnlineAgentsStrip compact />");
    expect(feed).toContain("overflow-visible");
  });

  it("distribui os quatro atalhos igualmente na largura mobile sem rolagem horizontal", () => {
    const shortcuts = read("src/components/dashboard/DashboardQuickActions.tsx");
    expect(shortcuts).toContain("data-dashboard-quick-actions");
    expect(shortcuts).toContain("grid w-full min-w-0 grid-cols-4");
    expect(shortcuts).toContain("h-14 w-full min-w-0");
    expect(shortcuts).toContain("h-6 w-6 md:h-5 md:w-5");
    expect(shortcuts).not.toContain("overflow-x-auto");
  });

  it("combina compositor e presença na mesma linha no desktop", () => {
    expect(feed).not.toContain("Ver toda a comunidade");
    expect(feed).toContain('can("online_users.view") && (');
    expect(feed).toContain("data-dashboard-community-actions");
    expect(feed).toContain("lg:flex-row lg:items-center");
    expect(feed).toContain("data-dashboard-online-users");
    expect(feed.match(/<OnlineAgentsStrip compact \/>/g)).toHaveLength(1);
  });

  it("alinha e amplia compositor e cards responsivamente sem overflow", () => {
    expect(feed).toContain('data-dashboard-community-feed-column');
    expect(feed).toContain('w-full min-w-0 space-y-4 lg:w-[88%] xl:w-[78%]');
    expect(feed).not.toContain('className="mx-auto w-full');
    expect(feed).not.toContain("max-w-[780px]");
    expect(feed).toContain('mx-0 w-full overflow-visible rounded-none border-x-0 shadow-none');
    expect(feed).not.toContain('-mx-4 overflow-visible');
    expect(feed).toContain('data-dashboard-community-post');
    expect(feed).toContain("min-w-0 overflow-hidden border-y");
    expect(feed).toContain('className="px-3 pb-3 pt-4 sm:px-5"');
    expect(feed).toContain("min-w-0 overflow-hidden");
  });

  it("não altera o dashboard compartilhado pelo Site Lab e white-labels", () => {
    expect(siteLabDashboard).toContain("export default function AgencyAdminHome");
    expect(siteLabDashboard).toContain("actions.map((a) => (");
    expect(siteLabDashboard).toContain("<IconAction");
    expect(siteLabDashboard).not.toContain("CommunitySocialFeed");
    expect(siteLabDashboard).not.toContain("DASHBOARD_PAGE_SIZE");
  });
});

describe("paginação contínua da Comunidade no dashboard", () => {
  it.each([
    [0, 0, undefined],
    [4, 4, undefined],
    [5, 5, undefined],
    [6, 5, 5],
  ])("trata lote com %i linhas", (count, shown, nextOffset) => {
    const page = buildCommunityFeedPage(Array.from({ length: count }, (_, index) => post(String(index))), 5, 0);
    expect(page.items).toHaveLength(shown);
    expect(page.nextOffset).toBe(nextOffset);
  });

  it("mescla páginas sucessivas sem repetir publicações", () => {
    const merged = mergeUniqueCommunityPages([
      { items: [post("1"), post("2"), post("3"), post("4"), post("5")], nextOffset: 5 },
      { items: [post("5"), post("6"), post("7")], nextOffset: undefined },
    ]);
    expect(merged.map(({ id }) => id)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("consulta lotes de cinco com ordem estável e bloqueia duplicação de requisições", () => {
    expect(hook).toContain("useInfiniteQuery");
    expect(hook).toContain(".order(\"id\", { ascending: false })");
    expect(hook).toContain(".range(pageParam, pageParam + pageSize)");
    expect(feed).toContain("const DASHBOARD_PAGE_SIZE = 5");
    expect(feed).toContain("IntersectionObserver");
    expect(feed).toContain("!hasNextPage || isFetchingNextPage");
    expect(feed).toContain("Carregar mais");
    expect(feed).toContain("Tentar carregar mais");
    expect(feed).toContain("fim das publicações");
  });

  it("mantém criação, edição, exclusão, curtidas, comentários e enquetes", () => {
    for (const operation of [
      "createPost", "updatePost", "deletePost", "toggleLike", "fetchComments", "addComment", "deleteComment", "votePoll",
    ]) expect(hook).toContain(operation);
    expect(hook.match(/invalidateQueries\(\{ queryKey: \[\"community-feed\"\] \}\)/g)?.length).toBeGreaterThanOrEqual(6);
  });
});