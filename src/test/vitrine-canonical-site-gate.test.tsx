import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

const fetchAgencyBySlug = vi.fn();
const fetchAgencyDomain = vi.fn();

vi.mock("@/lib/agencyDomains", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agencyDomains")>(
    "@/lib/agencyDomains",
  );
  return {
    ...actual,
    fetchAgencyBySlug: (slug: string) => fetchAgencyBySlug(slug),
    fetchAgencyDomain: (host: string) => fetchAgencyDomain(host),
  };
});

vi.mock("@/components/routing/AgencyDomainRoutes", () => ({
  default: ({ info, basePath }: { info: AgencyDomainInfo; basePath?: string }) => (
    <div data-testid="site-ads" data-slug={info.agency_slug} data-base={basePath}>
      Site white label
    </div>
  ),
}));

const casaNova = {
  user_id: "ae1e7b39-0254-4807-b6ea-3dc1e9d1fcc1",
  agency_slug: "casa-nova-tur",
  hostname: "casanovatur.demo.local",
  is_primary: true,
  agency_name: "Casa Nova Tur",
} as unknown as AgencyDomainInfo;

function setLocation(host: string, path: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { hostname: host, pathname: path, search: "", hash: "", protocol: "https:" },
  });
}

async function renderGate(host: string, path: string) {
  setLocation(host, path);
  const { AgencyDomainGate } = await import("@/components/routing/AgencyDomainGate");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AgencyDomainGate>
        <div data-testid="platform">Vitrine de Ofertas (plataforma)</div>
      </AgencyDomainGate>
    </QueryClientProvider>,
  );
}

describe("vitrine.tur.br/{agency_slug}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAgencyDomain.mockResolvedValue(null);
  });

  it("abre o site white label quando o slug tem Sites ADS ativo", async () => {
    fetchAgencyBySlug.mockResolvedValue(casaNova);
    await renderGate("vitrine.tur.br", "/casa-nova-tur");
    const el = await screen.findByTestId("site-ads");
    expect(el.getAttribute("data-slug")).toBe("casa-nova-tur");
    expect(el.getAttribute("data-base")).toBe("/casa-nova-tur");
    expect(fetchAgencyBySlug).toHaveBeenCalledWith("casa-nova-tur");
  });

  it("monta as rotas filhas do tenant sob o slug", async () => {
    fetchAgencyBySlug.mockResolvedValue(casaNova);
    await renderGate("vitrine.tur.br", "/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr");
    const el = await screen.findByTestId("site-ads");
    expect(el.getAttribute("data-base")).toBe("/casa-nova-tur");
  });

  it("mantém a Vitrine de Ofertas atual para slug sem Sites ADS", async () => {
    fetchAgencyBySlug.mockResolvedValue(null);
    await renderGate("vitrine.tur.br", "/agente-antigo");
    await waitFor(() => expect(screen.getByTestId("platform")).toBeInTheDocument());
    expect(screen.queryByTestId("site-ads")).toBeNull();
  });

  it("mostra a identificação neutra na raiz de vitrine.tur.br", async () => {
    await renderGate("vitrine.tur.br", "/");
    expect(screen.getByRole("heading", { name: "VITRINE" })).toBeInTheDocument();
    expect(screen.queryByTestId("platform")).toBeNull();
    expect(fetchAgencyBySlug).not.toHaveBeenCalled();
  });

  it("funciona em www.vitrine.tur.br (compatibilidade antes do redirect)", async () => {
    fetchAgencyBySlug.mockResolvedValue(casaNova);
    await renderGate("www.vitrine.tur.br", "/casa-nova-tur/ofertas");
    expect(await screen.findByTestId("site-ads")).toBeInTheDocument();
  });

  it("não afeta app.agentesdesonhos.com.br", async () => {
    await renderGate("app.agentesdesonhos.com.br", "/dashboard");
    expect(screen.getByTestId("platform")).toBeInTheDocument();
    expect(fetchAgencyBySlug).not.toHaveBeenCalled();
    expect(fetchAgencyDomain).not.toHaveBeenCalled();
  });

  it("preserva domínio próprio resolvido por hostname", async () => {
    fetchAgencyDomain.mockResolvedValue({ ...casaNova, hostname: "faeviagens.com.br" });
    await renderGate("faeviagens.com.br", "/gestao");
    const el = await screen.findByTestId("site-ads");
    expect(el.getAttribute("data-base")).toBeNull();
    expect(fetchAgencyBySlug).not.toHaveBeenCalled();
  });
});
