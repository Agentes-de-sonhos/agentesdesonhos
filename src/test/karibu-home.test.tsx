import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { OrlandoEditorialGallery } from "@/components/orlando/OrlandoEditorialGallery";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";
import { KARIBU_PREVIEW_INFO, KARIBU_PREVIEW_PROFILE, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveSections } from "@/lib/agencySiteConfig";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
import { isUniversalLandingEnabled } from "@/lib/universalLandingAccess";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";

const { reset, rpc } = vi.hoisted(() => ({ reset: vi.fn(), rpc: vi.fn(async (..._args: unknown[]): Promise<{ data: unknown[]; error: null }> => ({ data: [], error: null })) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc, auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
vi.mock("@/lib/resortCuration", async (original) => ({ ...await original<typeof import("@/lib/resortCuration")>(), useAgencyResortCuration: () => ({ data: undefined }) }));
vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), reset, state: "idle" }) }));
afterEach(() => { cleanup(); rpc.mockClear(); });

const officialHosts = ["kaributurismo.com.br", "www.kaributurismo.com.br"];
const preview = KARIBU_PREVIEW_INFO.hostname;
const home = (hostname = preview) => {
  const info = { ...KARIBU_PREVIEW_INFO, hostname };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<HelmetProvider><QueryClientProvider client={qc}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
};

describe("Karibu homepage and Orlando configuration", () => {
  it("uses the registered domain variants and preview without touching other profiles", () => {
    for (const hostname of [...officialHosts, preview]) {
      expect(resolveSiteProfile(hostname).key).toMatch(/^karibu/);
      expect(siteThemeRootClass(hostname)).toContain("wl-karibu");
      expect(isUniversalLandingEnabled(hostname)).toBe(true);
    }
    for (const hostname of ["caributurismo.com.br", "omundoemcores.com.br", "immturismo.com.br", "arenatravelgroup.com.br"]) {
      expect(siteThemeRootClass(hostname)).not.toContain("wl-karibu");
    }
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.featuredExperience?.enabled).toBe(true);
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.sections?.offers).toEqual({ enabled: false });
  });
  it("aligns the three banners and six destination cards to the briefing", () => {
    const p = KARIBU_PREVIEW_PROFILE;
    expect(p.hero?.map((slide) => slide.kicker)).toEqual(["CRUZEIROS", "ORLANDO · PARQUES E INGRESSOS", "DESTINOS NO BRASIL E NO EXTERIOR"]);
    expect(p.hero?.every((slide) => slide.title && slide.subtitle && slide.image)).toBe(true);
    expect(p.destinations?.map((destination) => destination.key)).toEqual(["brasil", "europa", "cruzeiros", "america-do-sul", "orlando", "eua-canada"]);
    expect(resolveSections(p.sections).map(({key}) => key).slice(0, 6)).toEqual(["offers", "destinations", "orlando", "resorts", "authority", "about"]);
    expect(p.about?.title).toContain("2011");
    expect(p.about?.title).not.toContain("Roseli");
    expect(p.about?.images).toBeUndefined();
    expect(p.footer?.descriptionHidden).toBe(true);
    expect(p.faq).toHaveLength(7);
  });
  it("renders offers first, no Xcaret, and resets to white after cruises", () => {
    const { container } = home();
    const root = container.querySelector(".wl-karibu")!;
    const sections = Array.from(root.querySelectorAll<HTMLElement>(".wl-karibu-surface > section, .wl-karibu-cruise > section"));
    expect(sections.slice(0, 6).map((s) => s.id)).toEqual(["ofertas", "destinos", "ingressos-orlando", "resorts", "autoridade", "sobre"]);
    expect(sections[0].parentElement).toHaveClass("wl-karibu-gradient");
    expect(sections[1].parentElement).not.toHaveClass("wl-karibu-gradient");
    expect(sections[5].parentElement).not.toHaveClass("wl-karibu-gradient");
    expect(root.querySelector("#experiencia-xcaret")).toBeNull();
    expect(root.querySelector("#rodape img[alt^='Logo ']")?.parentElement).not.toHaveClass("shadow");
    expect(screen.getByText("Novas ofertas aparecem aqui conforme a Karibu as publica.")).toBeInTheDocument();
    expect(rpc.mock.calls.some(([name]) => name === "get_public_offers")).toBe(false);
  });
  it("uses carousel controls above the quote and renders the newsletter before the footer without an unconfirmed social link", () => {
    const { container } = home();
    const desktopNav = container.querySelector('[data-hero-nav-placement="bottom-right"]') as HTMLElement;
    expect(desktopNav).not.toBeNull();
    expect(desktopNav.closest("#cotacao")).not.toBeNull();
    fireEvent.click(within(desktopNav).getByRole("button", { name: "Próximo destaque" }));
    expect(screen.getByRole("heading", { name: "Orlando no ritmo de quem viaja" })).toBeInTheDocument();
    const newsletter = document.getElementById("novidades")!;
    expect(newsletter.compareDocumentPosition(document.getElementById("rodape")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Acompanhe a Karibu" })).toBeNull();
    expect(screen.queryByRole("link", { name: "WhatsApp da Karibu" })).toBeNull();
    fireEvent.click(within(newsletter).getByRole("button", { name: "Quero me cadastrar" }));
    expect(screen.getByRole("dialog", { name: "Receba as novidades da Karibu" })).toBeInTheDocument();
  });
  it("reads only the live Karibu hostname and shows published offers in its general channel", async () => {
    rpc.mockImplementation(async (name) => ({ data: name === "get_public_offers" ? [
      { slug: "publica", title: "Oferta da Karibu", status: "published", channels: ["ofertas"] },
      { slug: "campanha", title: "Oferta somente de campanha", status: "published", channels: ["novembro"] },
      { slug: "vencida", title: "Oferta vencida", status: "published", expires_at: "2000-01-01T00:00:00Z" },
      { slug: "pausada", title: "Oferta pausada", status: "paused" },
    ] : [], error: null }));
    home(officialHosts[0]);
    const offerSection = document.getElementById("ofertas")!;
    await waitFor(() => expect(within(offerSection).getByRole("link", { name: /Oferta da Karibu/ })).toHaveAttribute("href", "/ofertas/publica"));
    expect(rpc).toHaveBeenCalledWith("get_public_offers", { p_hostname: officialHosts[0] });
    expect(within(offerSection).queryByText(/somente de campanha|vencida|pausada/)).toBeNull();
  });
  it("offers Disney and Universal links and shows the nine-photo gallery only on eligible hosts", () => {
    const { container, unmount } = render(<OrlandoTicketsSection hostname={officialHosts[0]} />);
    for (const target of ["/universal", "/disney"]) {
      const links = [...container.querySelectorAll<HTMLAnchorElement>(`a[href="${target}"]`)];
      expect(links).toHaveLength(2);
      expect(links.some((link) => link.querySelector("img"))).toBe(true);
      expect(links.some((link) => /saiba mais/i.test(link.textContent ?? ""))).toBe(true);
    }
    unmount();
    const { rerender } = render(<OrlandoEditorialGallery hostname={officialHosts[1]} />);
    expect(within(screen.getByRole("region", { name: "Parques e experiências em Orlando" })).getAllByRole("img", { hidden: true })).toHaveLength(9);
    rerender(<OrlandoEditorialGallery hostname="paraisoviagens.com" />);
    expect(screen.queryByRole("region")).toBeNull();
  });
});
