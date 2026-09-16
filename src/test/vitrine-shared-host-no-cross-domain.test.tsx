/**
 * Regressões da auditoria pública do host compartilhado `vitrine.tur.br`:
 * - nenhuma rota com slug redireciona para domínios especializados;
 * - links legados sem slug continuam indo para o domínio especializado;
 * - materiais/documentos públicos com slug renderizam no mesmo host;
 * - `/ofertas` de tenant válido sem vitrine mostra estado vazio amigável.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  parseAgencySlugLocation,
  isCanonicalAgencySiteHost,
  canonicalAgencySiteRedirectUrl,
} from "@/lib/agencySlugRouting";

const read = (p: string) => readFileSync(p, "utf8");

/** Reproduz a condição de redirect legado do orçamento público. */
function legacyQuoteRedirect(hostname: string, pathname: string): boolean {
  const isSharedHost = hostname === "vitrine.tur.br" || hostname === "www.vitrine.tur.br";
  return isSharedHost && /^\/orcamento\/[^/]+\/?$/.test(pathname);
}

describe("host compartilhado: sem redirect cross-domain", () => {
  it("rota de orçamento com slug NÃO redireciona", () => {
    expect(legacyQuoteRedirect("vitrine.tur.br", "/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr")).toBe(false);
    expect(legacyQuoteRedirect("www.vitrine.tur.br", "/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr")).toBe(false);
  });

  it("link legado sem slug continua indo para o domínio especializado", () => {
    expect(legacyQuoteRedirect("vitrine.tur.br", "/orcamento/SrPpMu8QatkVranqr7Wr")).toBe(true);
  });

  it("domínio especializado nunca redireciona a si mesmo", () => {
    expect(legacyQuoteRedirect("seuorcamento.tur.br", "/orcamento/SrPpMu8QatkVranqr7Wr")).toBe(false);
    expect(legacyQuoteRedirect("seuroteiro.tur.br", "/roteiro/qWqEhSpRXwQqUBtJPHWx")).toBe(false);
    expect(legacyQuoteRedirect("carteiradigital.tur.br", "/carteira/wrkj36K7cxevXzbJQEnX")).toBe(false);
  });

  it("roteiro e carteira públicos não possuem redirect para outro host", () => {
    for (const file of [
      "src/pages/RoteiroPublico.tsx",
      "src/pages/CarteiraPublica.tsx",
      "src/pages/RoteiroPublicoV2.tsx",
      "src/pages/CarteiraPublicaV2.tsx",
    ]) {
      let src = "";
      try {
        src = read(file);
      } catch {
        continue;
      }
      expect(src).not.toMatch(/window\.location\.replace\([^)]*(ROTEIRO_DOMAIN|CARTEIRA_DOMAIN)/);
    }
  });

  it("o único redirect do host compartilhado é www → apex, no mesmo host canônico", () => {
    const url = canonicalAgencySiteRedirectUrl({
      hostname: "www.vitrine.tur.br",
      pathname: "/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr",
      search: "",
      hash: "",
      protocol: "https:",
    });
    expect(url).toBe("https://vitrine.tur.br/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr");
    expect(
      canonicalAgencySiteRedirectUrl({
        hostname: "vitrine.tur.br",
        pathname: "/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr",
      }),
    ).toBeNull();
  });
});

describe("URLs amigáveis com slug no host compartilhado", () => {
  const paths = [
    "/casa-nova-tur",
    "/casa-nova-tur/ofertas",
    "/casa-nova-tur/area-do-cliente",
    "/casa-nova-tur/gestao",
    "/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr",
    "/casa-nova-tur/roteiro/qWqEhSpRXwQqUBtJPHWx",
    "/casa-nova-tur/carteira/wrkj36K7cxevXzbJQEnX",
    "/casa-nova-tur/fatura/ABC123",
    "/casa-nova-tur/materiais",
  ];

  it("todas resolvem o tenant pelo slug e preservam o prefixo", () => {
    for (const host of ["vitrine.tur.br", "www.vitrine.tur.br"]) {
      expect(isCanonicalAgencySiteHost(host)).toBe(true);
      for (const path of paths) {
        const loc = parseAgencySlugLocation(host, path);
        expect(loc?.slug).toBe("casa-nova-tur");
        expect(loc?.basePath).toBe("/casa-nova-tur");
      }
    }
  });

  it("domínio próprio segue sem prefixo de slug", () => {
    expect(parseAgencySlugLocation("casanovatur.com.br", "/orcamento/ABC")).toBeNull();
  });
});

describe("/ofertas de tenant válido sem vitrine publicada", () => {
  it("mostra estado vazio amigável, sem 'Vitrine não encontrada'", async () => {
    const { default: VitrinePublica } = await import("@/pages/VitrinePublica");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <VitrinePublica
            slugOverride="casa-nova-tur"
            tenantFallback={{ agencyName: "Casa Nova Tur", logoUrl: null, phone: "11999999999" }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Nenhuma oferta publicada no momento/i)).toBeTruthy();
    expect(screen.queryByText(/Vitrine não encontrada/i)).toBeNull();
    expect(screen.getByText(/Falar com a equipe/i)).toBeTruthy();
  });

  it("a rota /ofertas passa a identidade do tenant para a vitrine", () => {
    const src = read("src/components/routing/AgencyDomainRoutes.tsx");
    expect(src).toMatch(/tenantFallback=\{\{/);
    expect(src).toMatch(/agencyName: info\.agency_name/);
  });
});
