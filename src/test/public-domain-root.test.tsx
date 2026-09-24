import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PublicDomainRoot, {
  publicDomainRootLabel,
} from "@/components/routing/PublicDomainRoot";
import { AgencyDomainGate } from "@/components/routing/AgencyDomainGate";

vi.mock("@/lib/agencyDomains", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agencyDomains")>(
    "@/lib/agencyDomains",
  );
  return {
    ...actual,
    fetchAgencyBySlug: vi.fn().mockResolvedValue(null),
    fetchAgencyDomain: vi.fn().mockResolvedValue(null),
  };
});

const ROOTS = [
  ["vitrine.tur.br", "VITRINE"],
  ["seuroteiro.tur.br", "SEU ROTEIRO"],
  ["seuorcamento.tur.br", "SEU ORÇAMENTO"],
  ["proximaviagem.tur.br", "PRÓXIMA VIAGEM"],
  ["contato.tur.br", "CONTATO"],
  ["carteiradigital.tur.br", "CARTEIRA DIGITAL"],
] as const;

function setLocation(hostname: string, pathname: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { hostname, pathname, search: "", hash: "", protocol: "https:" },
  });
}

function renderGate(hostname: string, pathname: string) {
  setLocation(hostname, pathname);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AgencyDomainGate>
        <div data-testid="public-link">Conteúdo público existente</div>
      </AgencyDomainGate>
    </QueryClientProvider>,
  );
}

describe("raízes dos domínios públicos", () => {
  it.each(ROOTS)("mostra somente a identificação de %s", (hostname, label) => {
    renderGate(hostname, "/");
    expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: label })).toHaveAttribute("src", expect.stringContaining("/__l5e/assets-v1/"));
    expect(screen.queryByTestId("public-link")).toBeNull();
  });

  it.each(ROOTS)("também reconhece www em %s", (hostname, label) => {
    expect(publicDomainRootLabel(`www.${hostname}`, "/")).toBe(label);
  });

  it("não intercepta links completos nem outros domínios", () => {
    expect(publicDomainRootLabel("seuorcamento.tur.br", "/agencia/CODIGO")).toBeNull();
    expect(publicDomainRootLabel("seuroteiro.tur.br", "/agencia/CODIGO")).toBeNull();
    expect(publicDomainRootLabel("carteiradigital.tur.br", "/agencia/CODIGO")).toBeNull();
    expect(publicDomainRootLabel("contato.tur.br", "/cartao-publico")).toBeNull();
    expect(publicDomainRootLabel("app.agentesdesonhos.com.br", "/")).toBeNull();

    renderGate("seuorcamento.tur.br", "/agencia/CODIGO");
    expect(screen.getByTestId("public-link")).toBeInTheDocument();
  });

  it("mantém o título acessível da página", () => {
    render(<PublicDomainRoot label="VITRINE" />);
    expect(document.title).toBe("VITRINE — Agentes de Sonhos");
  });
});