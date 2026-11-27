import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BAGAGEM_NA_MAO_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import { AgencyBrandSpinner, BagagemHomeIntro, isPasswordGateLoaderSuppressed } from "@/components/whitelabel/AgencyBrandSpinner";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";

const { reset } = vi.hoisted(() => ({ reset: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: [], error: null })), auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
vi.mock("@/lib/resortCuration", async (original) => ({ ...await original<typeof import("@/lib/resortCuration")>(), useAgencyResortCuration: () => ({ data: undefined }) }));
vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), reset, state: "idle" }) }));
afterEach(cleanup);

describe("home oficial da Bagagem na Mão", () => {
  it("pulsa o logotipo apenas na entrada dos domínios oficiais", () => {
    const prior = window.location.pathname;
    try {
      for (const host of ["bagagemnamao.com.br", "www.bagagemnamao.com.br"]) {
        window.history.replaceState(null, "", "/");
        const splash = render(<BagagemHomeIntro hostname={host} />);
        const logo = splash.container.querySelector("[data-bagagem-home-intro] img");
        expect(logo).toHaveClass("animate-brand-breathe", "motion-reduce:animate-none");
        expect(logo?.getAttribute("src")).toMatch(/briefing-19-v1-logo\.png$/);
        splash.unmount();
        for (const path of ["/universal", "/ingressos-orlando", "/resorts-brasil"]) {
          window.history.replaceState(null, "", path);
          expect(isPasswordGateLoaderSuppressed(host)).toBe(true);
          const internal = render(<><BagagemHomeIntro hostname={host} /><AgencyBrandSpinner hostname={host} /></>);
          expect(internal.container).toBeEmptyDOMElement();
          internal.unmount();
        }
      }
      window.history.replaceState(null, "", "/ads-briefing-preview/briefing-19-v1");
      expect(render(<BagagemHomeIntro hostname="briefing-19-v1.preview.local" />).container).toBeEmptyDOMElement();
    } finally {
      window.history.replaceState(null, "", prior);
    }
  });

  it("renderiza as três imagens/cópias, links internos e captação sem convite exposto", () => {
    const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "bagagemnamao.com.br" };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<HelmetProvider><QueryClientProvider client={qc}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
    expect(screen.getByRole("heading", { name: "Sua família não viaja em modo padrão" })).toBeInTheDocument();
    const controls = within(container.querySelector<HTMLElement>('[data-hero-nav-placement="bottom-right"]')!);
    fireEvent.click(controls.getByRole("button", { name: "Próximo destaque" }));
    expect(screen.getByRole("heading", { name: "Mais tempo nos parques. Menos correria entre eles." })).toBeInTheDocument();
    fireEvent.click(controls.getByRole("button", { name: "Próximo destaque" }));
    expect(screen.getByRole("heading", { name: "Dos parques ao navio, sem apertar o roteiro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "O que você deseja planejar?" })).toBeInTheDocument();
    expect(within(container.querySelector<HTMLElement>("#cotacao")!).getByRole("button", { name: "Solicitar", exact: true })).toBeInTheDocument();
    const clubMed = within(screen.getByTestId("club-med-snow-home"));
    expect(clubMed.getByRole("link", { name: "Conheça os resorts Club Med" })).toHaveAttribute("href", "/club-med-neve");
    const headerNav = container.querySelector<HTMLElement>("header nav")!;
    expect(Array.from(headerNav.children).map((el) => el.matches("a") ? el.textContent?.trim() : el.firstElementChild?.textContent?.trim())).toEqual(["Início", "Destaques", "Especialidades", "Blog", "Sobre"]);
    const desktopNav = within(headerNav);
    expect(desktopNav.getByRole("link", { name: "Blog", exact: true })).toHaveAttribute("href", "/blog");
    const orlandoFlyout = desktopNav.getByRole("button", { name: "Orlando" });
    expect(orlandoFlyout).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(orlandoFlyout);
    expect(orlandoFlyout).toHaveAttribute("aria-expanded", "true");
    expect(desktopNav.getByRole("link", { name: "Parques e experiências" })).toHaveAttribute("href", "/#ingressos-orlando");
    expect(desktopNav.getByRole("link", { name: "Disney", exact: true })).toHaveAttribute("href", "/disney");
    expect(desktopNav.getByRole("link", { name: "Universal", exact: true })).toHaveAttribute("href", "/universal");
    expect(desktopNav.getByRole("link", { name: "Cruzeiros 26/27" })).toHaveAttribute("href", "/#autoridade");
    expect(desktopNav.getByRole("link", { name: "Perguntas frequentes" })).toHaveAttribute("href", "/#faq");
    expect(desktopNav.queryByRole("link", { name: "Dúvidas", exact: true })).toBeNull();
    fireEvent.keyDown(orlandoFlyout, { key: "Escape" });
    expect(orlandoFlyout).toHaveAttribute("aria-expanded", "false");
    const header = within(container.querySelector<HTMLElement>("header")!);
    const mobileToggle = header.getByRole("button", { name: "Abrir menu" });
    fireEvent.click(mobileToggle);
    const disclosure = container.querySelector("header details")!;
    expect(disclosure.querySelector("summary")).toHaveTextContent("Orlando");
    disclosure.setAttribute("open", "");
    expect(within(disclosure as HTMLElement).getByRole("link", { name: "Disney" })).toHaveAttribute("href", "/disney");
    fireEvent.click(mobileToggle);
    const surfaces = Array.from(container.querySelectorAll<HTMLElement>("[data-bagagem-section]"));
    expect(surfaces.slice(0, 5).map((item) => item.dataset.bagagemSection)).toEqual(["offers", "orlando", "destinations", "modules", "resorts"]);
    expect(surfaces.filter((item) => item.classList.contains("wl-bagagem-home-tint")).map((item) => item.dataset.bagagemSection)).toEqual(["orlando", "modules", "differentials", "faq"]);
    expect(container.querySelector("#assinatura")).toBeNull();
    expect(container.querySelector("#ofertas")?.parentElement).not.toHaveClass("wl-bagagem-home-tint");
    expect(container.querySelector("#destinos")?.parentElement).not.toHaveClass("wl-bagagem-home-tint");
    expect(container.querySelector("#resorts")?.parentElement).not.toHaveClass("wl-bagagem-home-tint");
    expect(container.querySelector("#faq")?.parentElement).toHaveClass("wl-bagagem-home-tint");
    const offers = within(container.querySelector<HTMLElement>("#ofertas")!);
    expect(offers.getByRole("heading", { name: "Ofertas selecionadas" })).toBeInTheDocument();
    expect(offers.queryByRole("link", { name: "Ver todas as ofertas" })).toBeNull();
    const seasonIndex = surfaces.findIndex((surface) => surface.classList.contains("wl-bagagem-season"));
    expect(surfaces[seasonIndex]).toHaveAttribute("data-bagagem-section", "authority");
    expect(surfaces.at(seasonIndex + 1)).toHaveAttribute("data-bagagem-section", "about");
    expect(surfaces.at(seasonIndex + 1)).not.toHaveClass("wl-bagagem-home-tint");
    expect(surfaces.at(-2)).toHaveAttribute("data-bagagem-section", "faq");
    expect(surfaces.at(-1)).toHaveAttribute("data-bagagem-section", "newsletter");
    expect(container.querySelector("#destinos [data-bagagem-cta]")).toBeNull();
    const orlando = within(container.querySelector<HTMLElement>("#ingressos-orlando")!);
    expect(orlando.getByText("Ingressos e parques")).toHaveClass("wl-kicker");
    expect(orlando.getByText("Próximo passo")).toHaveClass("wl-orlando-step-kicker");
    expect(orlando.getAllByRole("link", { name: "Saiba mais" }).find((link) => link.getAttribute("href") === "/universal")).toHaveClass("wl-orlando-home-cta");
    expect(orlando.getAllByRole("button", { name: /Explorar o mapa de / })[0]).toHaveClass("wl-orlando-home-cta");
    expect(orlando.getByRole("link", { name: /Calcular meus dias/ })).toHaveClass("wl-orlando-home-cta");
    expect(container.querySelector('[data-destination="canada"] img')).toHaveAttribute("src", "/bagagem-na-mao/canada-lago-moraine.webp");
    expect(container.querySelector('[data-destination="resorts-all-inclusive"]')).toHaveAttribute("href", "/resorts-brasil/iberostar-bahia");
    expect(container.querySelectorAll('[data-testid="cruise-season-companies"] img')).toHaveLength(5);
    expect(container.querySelectorAll(".wl-step-num")).toHaveLength(4);
    const faq = within(screen.getByRole("region", { name: "Ainda tem alguma dúvida?" }));
    const question = faq.getByRole("textbox", { name: "Sua dúvida" });
    const blocked = faq.getByRole("button", { name: "Enviar", exact: true });
    expect(blocked).toBeDisabled();
    expect(blocked.parentElement).toBe(question.parentElement);
    expect(question).toHaveAttribute("rows", "1");
    expect(faq.getByText("A Bagagem na Mão Viagens responde pelo WhatsApp.")).toBeInTheDocument();
    expect(faq.queryByText(/Sua mensagem abre/)).toBeNull();
    fireEvent.change(question, { target: { value: "Olá, tenho uma dúvida." } });
    expect(faq.getByRole("link", { name: "Enviar", exact: true })).toHaveAttribute("href", "https://wa.me/5521988559515?text=Ol%C3%A1%2C%20tenho%20uma%20d%C3%BAvida.");
    const footer = within(container.querySelector<HTMLElement>("#rodape")!);
    expect(footer.getByRole("link", { name: "Falar por WhatsApp" })).toHaveAttribute("href", "https://wa.me/5521988559515");
    expect(footer.queryByText(/98855-9515/)).toBeNull();
    expect(footer.queryByText(/Um jeito novo de viajar, desde 2014/i)).toBeNull();
    expect(footer.getByText(/Rua Conde de Bonfim, 211/)).toBeInTheDocument();
    const footerLogo = footer.getByRole("img", { name: "Logo Bagagem na Mão Viagens" });
    expect(footerLogo).toHaveClass("h-16");
    expect(footerLogo.parentElement?.tagName).toBe("DIV");
    expect(footerLogo.parentElement?.className).not.toMatch(/shadow|ring|border|bg-white/);
    const social = screen.getByRole("region", { name: "Siga-nos nas redes" });
    expect(container.querySelector("#novidades")?.nextElementSibling).toBe(social);
    expect(within(social).getByRole("link", { name: "Instagram da agência" })).toHaveAttribute("href", "https://www.instagram.com/bagagemnamaoviagens/");
    expect(container.querySelector('a[href*="chat.whatsapp.com"]')).toBeNull();
    const newsletterPanel = within(container.querySelector<HTMLElement>("#novidades .wl-bagagem-newsletter-panel")!);
    const groupButton = newsletterPanel.getByRole("button", { name: "Solicitar acesso ao grupo" });
    expect(newsletterPanel.queryByRole("img")).toBeNull();
    expect(container.querySelector("#novidades img")).toHaveAttribute("src", "/bagagem-na-mao/marcia-cruzeiro-disney.webp");
    expect(newsletterPanel.getByRole("heading", { name: "Oportunidades e atendimento pelo WhatsApp" })).toBeInTheDocument();
    fireEvent.click(groupButton);
    expect(screen.getByRole("dialog", { name: "Grupo de oportunidades da Bagagem na Mão" })).toBeInTheDocument();
    expect(document.querySelector('a[href*="chat.whatsapp.com"]')).toBeNull();
  });
});
