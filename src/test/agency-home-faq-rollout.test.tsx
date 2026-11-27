import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BAGAGEM_NA_MAO_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
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
