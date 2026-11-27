import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BAGAGEM_NA_MAO_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteStatus } from "@/lib/agencySiteStatus";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: [], error: null })), auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
vi.mock("@/lib/resortCuration", async (original) => ({ ...await original<typeof import("@/lib/resortCuration")>(), useAgencyResortCuration: () => ({ data: undefined }) }));
vi.mock("@/hooks/useAgencySiteRequest", () => ({ useAgencySiteRequest: () => ({ submit: vi.fn(), reset: vi.fn(), state: "idle" }) }));
vi.mock("@/hooks/usePublicBlog", () => ({ usePublicBlogStatus: () => ({}), usePublicBlogList: () => ({}) }));
vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
afterEach(cleanup);

const liveHosts = [
  ["100limites.tur.br", "100 Limites Viagens", "48996086615"],
  ["arenatravelgroup.com.br", "Arena Travel Group", "4792690807"],
  ["bagagemnamao.com.br", "Bagagem na Mão Viagens", "21988559515"],
  ["destinoscomaju.com.br", "Destinos com a Ju", "11957414840"],
  ["www.essyatur.com.br", "Essyatur", "11962193690"],
  ["immturismo.com.br", "IM&M Viagens e Turismo", "11996942844"],
  ["kaributurismo.com.br", "Karibu Turismo", "11947577307"],
  ["paraisoviagens.com", "Paraíso Viagens", "48999466467"],
  ["pristur.com.br", "Pristur Viagens", "11983017038"],
  ["www.bardelliviagens.com.br", "Bardelli Viagens", "11975767319"],
  ["www.curtiviagens.com.br", "Curti Viagens", "11992506672"],
  ["www.dricaviagens.com.br", "Drica Viagens", "21987907853"],
  ["www.innovati.tur.br", "Innovati Travel", "11918578547"],
  ["www.omundoemcores.com.br", "O Mundo em Cores", "11999954734"],
  ["www.shoppingviagens.com.br", "Shopping Viagens", "11947148466"],
] as const;

describe("FAQ compacto nas páginas institucionais de agência", () => {
  it.each(liveHosts)("renderiza nome, campo e WhatsApp público em %s", (hostname, name, phone) => {
    const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname, agency_name: name, phone };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<HelmetProvider><QueryClientProvider client={qc}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
    const destinations = container.querySelector<HTMLElement>("#destinos");
    expect(destinations).not.toBeNull();
    if (destinations) expect(within(destinations).getByText("Destaques", { exact: true })).toBeInTheDocument();
    const highlightsLink = container.querySelector<HTMLAnchorElement>('header nav a[href="/#destinos"]');
    expect(highlightsLink).not.toBeNull();
    if (highlightsLink) expect(highlightsLink).toHaveTextContent(/^Destaques$/);
    const faq = within(container.querySelector<HTMLElement>("#faq")!);
    const block = faq.getByRole("region", { name: "Ainda tem alguma dúvida?" });
    const row = within(block);
    expect(row.getByText(`${name.startsWith("O ") ? name : `A ${name}`} responde pelo WhatsApp.`)).toBeInTheDocument();
    const input = row.getByPlaceholderText("Escreva sua dúvida aqui");
    const send = row.getByRole("button", { name: "Enviar" });
    expect(send).toBeDisabled();
    expect(send.parentElement).toBe(input.parentElement);
    expect(input).toHaveAttribute("rows", "1");
    const last = Array.from(faq.queryAllByRole("button")).filter((q) => q.getAttribute("data-orientation") === "vertical").at(-1);
    if (last) expect(last.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(input, { target: { value: "   " } });
    expect(row.getByRole("button", { name: "Enviar" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "Quero saber mais & tirar dúvidas." } });
    const link = row.getByRole("link", { name: "Enviar" });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toMatch(/^\/55\d{10,11}$/);
    expect(url.searchParams.get("text")).toBe("Quero saber mais & tirar dúvidas.");
    expect(link).toHaveAttribute("target", "_blank");
    expect(row.queryByText(/Sua mensagem abre/)).toBeNull();
  });
  it("não altera a publicação de Faé, cuja página inicial está em construção", () => {
    expect(resolveSiteStatus("faeviagens.com.br")).toBe("under_construction");
  });
});

it("ajusta só a home oficial da Innovati e mantém as rotas de Orlando", () => {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "www.innovati.tur.br", agency_name: "Innovati Travel", phone: "11918578547", logo_url: "/innovati-logo.png" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
  expect(container.querySelector(".wl-innovati-official > header")).not.toBeNull();
  expect(container.querySelector("#assinatura, [data-innovati-section=highlights], a[href='/#assinatura']")).toBeNull();
  for (const id of ["destinos", "resorts", "ingressos-orlando", "autoridade", "sobre", "faq"]) {
    expect(container.querySelector(`[data-innovati-section] > #${id}`)).not.toBeNull();
  }
  expect(container.querySelector("[data-innovati-section=authority] > #autoridade")).not.toBeNull();
  const park = within(container.querySelector("#ingressos-orlando")!);
  expect(park.getByRole("link", { name: "Saiba mais sobre Universal Orlando Resort" })).toHaveAttribute("href", "/universal");
  const footer = container.querySelector("#rodape")!;
  const logo = within(footer as HTMLElement).getByRole("img", { name: "Logo Innovati Travel" });
  expect(logo.parentElement?.tagName).toBe("DIV");
  expect(footer).not.toHaveTextContent("Consultoria de viagens e roteiros sob medida em Franco da Rocha");
  expect(footer).not.toHaveTextContent("91857-8547");
  expect(within(footer as HTMLElement).getByRole("link", { name: "Falar por WhatsApp" })).toHaveAttribute("href", "https://wa.me/5511918578547");
});

it("mostra Cativa Operadora logo depois das avaliações da Innovati", () => {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "www.innovati.tur.br", agency_name: "Innovati Travel", phone: "11918578547" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
  const reviews = container.querySelector("#avaliacoes");
  const partners = container.querySelector<HTMLElement>("#parceiros")!;
  expect(reviews?.nextElementSibling).toBe(partners);
  const section = within(partners);
  expect(section.getByRole("heading", { name: "Parceiros" })).toBeInTheDocument();
  expect(section.getAllByRole("listitem")).toHaveLength(1);
  expect(section.getByText("Cativa Operadora")).toBeInTheDocument();
  expect(partners.querySelector("img")).toHaveAttribute("src", "/innovati-travel/cativa-operadora.png");
});

it("coloca Visto Americano depois de Especialidades e ancora a seção da home da Innovati", () => {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "www.innovati.tur.br", agency_name: "Innovati Travel", phone: "11918578547" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
  const nav = within(container.querySelector("header nav")! as HTMLElement);
  const visaLink = nav.getByRole("link", { name: "Visto Americano" });
  expect(visaLink).toHaveAttribute("href", "/#visto-americano");
  const specialties = nav.getByText("Especialidades", { exact: true });
  expect(specialties.compareDocumentPosition(visaLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const section = within(container.querySelector("#visto-americano")! as HTMLElement);
  expect(section.getByRole("heading", { name: "Vai viajar para os Estados Unidos?" })).toBeInTheDocument();
  fireEvent.click(section.getByRole("button", { name: "Pedir orientação sobre o visto" }));
  expect(section.getByRole("textbox", { name: "WhatsApp" })).toBeInTheDocument();
  expect(section.queryByLabelText(/passaporte|documento/i)).toBeNull();
});

it("mantém os controles da Innovati à esquerda no fluxo do banner, acima da cotação", () => {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "www.innovati.tur.br", agency_name: "Innovati Travel", phone: "11918578547" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
  const banner = container.querySelector<HTMLElement>("#topo")!;
  const controls = banner.querySelector<HTMLElement>('[data-hero-nav-placement="inline-left"]')!;
  const requestArea = container.querySelector<HTMLElement>("#cotacao")!;
  expect(controls).toHaveClass("justify-start");
  expect(controls.compareDocumentPosition(requestArea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(banner.className).not.toContain("lg:h-");
  expect(parseInt(banner.style.paddingBottom, 10)).toBeGreaterThanOrEqual(56);
  expect(within(requestArea).queryByRole("button", { name: "Próximo destaque" })).toBeNull();
  const nav = within(controls);
  fireEvent.click(nav.getByRole("button", { name: "Próximo destaque" }));
  expect(nav.getByRole("button", { name: "Ir para o destaque 2" })).toHaveAttribute("aria-current", "true");
  fireEvent.click(nav.getByRole("button", { name: "Destaque anterior" }));
  expect(nav.getByRole("button", { name: "Ir para o destaque 1" })).toHaveAttribute("aria-current", "true");
});

it("publica o Quem Somos integral da Innovati sem afetar a prévia ou outros sites", () => {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "www.innovati.tur.br", agency_name: "Innovati Travel", phone: "11918578547" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
  const story = resolveSiteProfile(info.hostname).about!.fullStory!;
  const section = container.querySelector<HTMLElement>("#sobre")!;
  const about = within(section);
  expect(about.getByRole("heading", { name: "Olá" })).toBeInTheDocument();
  expect(story.paragraphs).toHaveLength(9);
  expect(Array.from(section.querySelectorAll("[data-agency-full-story] > p"), (p) => p.textContent)).toEqual(story.paragraphs);
  expect(about.getByRole("img", { name: story.portrait.alt })).toHaveAttribute("src", "/innovati-travel/jussara.webp");
  for (const title of ["Valores", "Missão", "Visão"]) expect(about.getByRole("heading", { name: title })).toBeInTheDocument();
  expect(about.getAllByRole("listitem").map((li) => li.textContent)).toEqual(story.values);
  expect(about.getByText(story.mission, { exact: true })).toBeInTheDocument();
  expect(about.getByText(story.vision, { exact: true })).toBeInTheDocument();
  expect(resolveSiteProfile("briefing-24-v1.preview.local").about?.fullStory).toBeUndefined();
  expect(resolveSiteProfile("immturismo.com.br").about?.fullStory).toBeUndefined();
});

it("inclui Novidades da Innovati após o FAQ, com convite direto e o Instagram da agência", () => {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname: "www.innovati.tur.br", agency_name: "Innovati Travel", phone: "11918578547" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
  const node = container.querySelector<HTMLElement>("#novidades")!;
  expect(container.querySelector("#faq")!.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const section = within(node);
  expect(section.getByRole("heading", { name: "Receba oportunidades de viagem no WhatsApp" })).toBeInTheDocument();
  expect(section.getByRole("link", { name: "Entrar no grupo do WhatsApp" })).toHaveAttribute("href", "https://chat.whatsapp.com/KzyQhTCtZGy6iVfgRcOUbI?mode=r_c");
  expect(node.nextElementSibling).toHaveTextContent("Acompanhe a Innovati Travel");
});

it.each(["innovati.tur.br", "www.innovati.tur.br"])("abre o certificado certo nos selos do cabeçalho e rodapé de %s", (hostname) => {
  const info = { ...BAGAGEM_NA_MAO_PREVIEW_INFO, hostname, agency_name: "Innovati Travel", phone: "11918578547" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container } = render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter><AgencySiteLayout info={info}><p>Home</p></AgencySiteLayout></MemoryRouter></QueryClientProvider></HelmetProvider>);
  const header = within(container.querySelector<HTMLElement>("header")!);
  const footer = within(container.querySelector<HTMLElement>("footer")!);
  const headerSeals = header.getAllByRole("button", { name: "Ver certificado Cadastur" });
  expect(headerSeals).toHaveLength(2); // versão desktop e versão mobile
  for (const trigger of [...headerSeals, footer.getByRole("button", { name: "Ver certificado Cadastur" })]) {
    fireEvent.click(trigger);
    const modal = within(document.body).getByRole("dialog", { name: "Certificado Cadastur" });
    expect(within(modal).getByRole("img", { name: "Certificado Cadastur da Innovati Travel" })).toHaveAttribute("src", "/innovati-travel/certificado-cadastur.webp");
    fireEvent.click(within(modal).getByRole("button", { name: "Fechar" }));
  }
});
