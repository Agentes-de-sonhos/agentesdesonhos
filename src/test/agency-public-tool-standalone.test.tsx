import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { isAgencyPublicToolPath } from "@/lib/agencyPublicToolRoutes";

vi.mock("@/pages/OrcamentoPublicoV2", () => ({
  default: () => <div data-testid="tool-orcamento">Orçamento público</div>,
}));
vi.mock("@/pages/RoteiroPublicoV2", () => ({
  default: () => <div data-testid="tool-roteiro">Roteiro público</div>,
}));
vi.mock("@/pages/CarteiraPublicaV2", () => ({
  default: () => <div data-testid="tool-carteira">Carteira pública</div>,
}));
vi.mock("@/pages/FaturaPublica", () => ({
  default: () => <div data-testid="tool-fatura">Fatura pública</div>,
}));
vi.mock("@/pages/VitrinePublica", () => ({
  default: () => <div data-testid="page-ofertas">Ofertas</div>,
}));
vi.mock("@/pages/whitelabel/AgencySiteHome", () => ({
  default: () => <div data-testid="page-home">Home</div>,
}));
vi.mock("@/pages/whitelabel/AgencyClientArea", () => ({
  default: () => <div data-testid="page-cliente">Área do cliente</div>,
}));
vi.mock("@/pages/whitelabel/AgencyPreviewGate", () => ({
  default: () => <div>Preview</div>,
}));
vi.mock("@/pages/PoliticasPrivacidade", () => ({ default: () => <div>Privacidade</div> }));
vi.mock("@/pages/TermosDeUso", () => ({ default: () => <div>Termos</div> }));

const info = {
  hostname: "100limites.tur.br",
  agency_slug: "100limites",
  public_slug: "100limites",
  agency_name: "100 Limites Viagens",
  logo_url: null,
  whatsapp: "5548999999999",
  phone: "4899999999",
  city: "Palhoça",
  state: "SC",
} as unknown as AgencyDomainInfo;

async function renderAt(path: string) {
  window.history.pushState({}, "", path);
  const { default: AgencyDomainRoutes } = await import(
    "@/components/routing/AgencyDomainRoutes"
  );
  return render(<AgencyDomainRoutes info={info} />);
}

function shellPresent() {
  return {
    header: document.querySelector("header"),
    footer: document.querySelector("footer"),
    nav: document.querySelector("nav"),
  };
}

describe("classificação de rotas White Label", () => {
  it("reconhece as rotas públicas de ferramentas", () => {
    for (const p of [
      "/orcamento/ABC123",
      "/roteiro/ABC123",
      "/carteira/ABC123",
      "/viagem/ABC123",
      "/fatura/ABC123",
      "/orcamento/ABC123/",
      "/orcamento/ABC123?utm_source=wa",
    ]) {
      expect(isAgencyPublicToolPath(p), p).toBe(true);
    }
  });

  it("não classifica páginas institucionais como ferramenta", () => {
    for (const p of [
      "/",
      "/ofertas",
      "/area-do-cliente",
      "/politicasdeprivacidade",
      "/termosdeuso",
      "/preview",
      "/orcamento",
    ]) {
      expect(isAgencyPublicToolPath(p), p).toBe(false);
    }
  });
});

describe("links públicos de ferramentas em domínio White Label", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
  });

  const cases: [string, string][] = [
    ["/orcamento/ABC123", "tool-orcamento"],
    ["/roteiro/ABC123", "tool-roteiro"],
    ["/carteira/ABC123", "tool-carteira"],
    ["/viagem/ABC123", "tool-carteira"],
    ["/fatura/ABC123", "tool-fatura"],
  ];

  it.each(cases)("%s renderiza standalone sem shell institucional", async (path, testid) => {
    await renderAt(path);
    expect(await screen.findByTestId(testid)).toBeInTheDocument();
    const { header, footer, nav } = shellPresent();
    expect(header).toBeNull();
    expect(footer).toBeNull();
    expect(nav).toBeNull();
    expect(screen.queryByText("Área do Cliente")).toBeNull();
    expect(screen.queryByRole("link", { name: /Atendimento/i })).toBeNull();
    // Sem wrapper residual do shell (min-h-screen + bg do site) ao redor.
    expect(document.querySelector(".min-h-screen.bg-background")).toBeNull();
  }, 30000);

  it("preserva query string do link atual", async () => {
    await renderAt("/orcamento/ABC123?ref=whatsapp");
    expect(await screen.findByTestId("tool-orcamento")).toBeInTheDocument();
    expect(window.location.search).toBe("?ref=whatsapp");
  }, 30000);
});

describe("páginas institucionais White Label (negativo)", () => {
  it.each([
    ["/ofertas", "page-ofertas"],
    ["/area-do-cliente", "page-cliente"],
  ])("%s mantém cabeçalho e rodapé", async (path, testid) => {
    await renderAt(path);
    expect(await screen.findByTestId(testid)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector("header")).not.toBeNull();
    });
    expect(document.querySelector("footer")).not.toBeNull();
    expect(document.querySelector("nav")).not.toBeNull();
  }, 30000);
});
