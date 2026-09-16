import { describe, it, expect } from "vitest";
import {
  canonicalAgencySiteRedirectUrl,
  isCanonicalAgencySiteHost,
  isSharedAgencySiteHost,
  isTechnicalSharedAgencySiteHost,
  isValidAgencySlug,
  agencyRouteBasePath,
  parseAgencySlugLocation,
  shouldNoindexAgencyPath,
  withAgencyBasePath,
} from "@/lib/agencySlugRouting";
import { isPotentialAgencyHost, agencyHostFromLocation } from "@/lib/agencyDomains";

describe("vitrine.tur.br como domínio compartilhado canônico dos Sites ADS", () => {
  it("reconhece apex e www como host canônico compartilhado", () => {
    for (const host of ["vitrine.tur.br", "www.vitrine.tur.br", "VITRINE.TUR.BR"]) {
      expect(isCanonicalAgencySiteHost(host)).toBe(true);
      expect(isSharedAgencySiteHost(host)).toBe(true);
      expect(isTechnicalSharedAgencySiteHost(host)).toBe(false);
    }
  });

  it("mantém o host técnico interno já implementado", () => {
    expect(isSharedAgencySiteHost("sites.agentesdesonhos.com.br")).toBe(true);
    expect(isTechnicalSharedAgencySiteHost("sites.agentesdesonhos.com.br")).toBe(true);
    expect(isCanonicalAgencySiteHost("sites.agentesdesonhos.com.br")).toBe(false);
  });

  it("resolve o slug e as rotas filhas do tenant", () => {
    const loc = parseAgencySlugLocation("vitrine.tur.br", "/casa-nova-tur");
    expect(loc).toEqual({
      slug: "casa-nova-tur",
      basePath: "/casa-nova-tur",
      internalPath: "/",
    });

    const cases: [string, string][] = [
      ["/casa-nova-tur/ofertas", "/ofertas"],
      ["/casa-nova-tur/gestao", "/gestao"],
      ["/casa-nova-tur/gestao/reservas", "/gestao/reservas"],
      ["/casa-nova-tur/area-do-cliente", "/area-do-cliente"],
      ["/casa-nova-tur/area-do-cliente/viagens/123", "/area-do-cliente/viagens/123"],
      ["/casa-nova-tur/orcamento/SrPpMu8QatkVranqr7Wr", "/orcamento/SrPpMu8QatkVranqr7Wr"],
      ["/casa-nova-tur/roteiro/qWqEhSpRXwQqUBtJPHWx", "/roteiro/qWqEhSpRXwQqUBtJPHWx"],
      ["/casa-nova-tur/carteira/wrkj36K7cxevXzbJQEnX", "/carteira/wrkj36K7cxevXzbJQEnX"],
      ["/casa-nova-tur/fatura/ABC123", "/fatura/ABC123"],
    ];
    for (const [url, internal] of cases) {
      const parsed = parseAgencySlugLocation("vitrine.tur.br", url);
      expect(parsed?.slug).toBe("casa-nova-tur");
      expect(parsed?.internalPath).toBe(internal);
      expect(withAgencyBasePath("/casa-nova-tur", internal)).toBe(url);
    }
  });

  it("funciona igualmente em www (antes do redirecionamento)", () => {
    expect(agencyRouteBasePath("www.vitrine.tur.br", "/casa-nova-tur/ofertas")).toBe(
      "/casa-nova-tur",
    );
  });

  it("redireciona www para o apex sem loop e sem afetar outros hosts", () => {
    expect(
      canonicalAgencySiteRedirectUrl({
        hostname: "www.vitrine.tur.br",
        pathname: "/casa-nova-tur/ofertas",
        search: "?a=1",
        hash: "#x",
        protocol: "https:",
      }),
    ).toBe("https://vitrine.tur.br/casa-nova-tur/ofertas?a=1#x");

    expect(
      canonicalAgencySiteRedirectUrl({ hostname: "vitrine.tur.br", pathname: "/casa-nova-tur" }),
    ).toBeNull();
    expect(
      canonicalAgencySiteRedirectUrl({ hostname: "app.agentesdesonhos.com.br", pathname: "/" }),
    ).toBeNull();
    expect(
      canonicalAgencySiteRedirectUrl({ hostname: "casanovatur.com.br", pathname: "/" }),
    ).toBeNull();
  });

  it("preserva domínios próprios das agências", () => {
    expect(isPotentialAgencyHost("100limites.tur.br")).toBe(false);
    expect(isPotentialAgencyHost("faeviagens.com.br")).toBe(true);
    expect(parseAgencySlugLocation("faeviagens.com.br", "/ofertas")).toBeNull();
    expect(agencyRouteBasePath("faeviagens.com.br", "/gestao")).toBe("");
  });

  it("preserva a rota técnica com __agency_host na prévia", () => {
    expect(
      agencyHostFromLocation(
        "id-preview--dd6dbb29.lovable.app",
        "?__agency_host=casanovatur.demo.local",
      ),
    ).toBe("casanovatur.demo.local");
    // Domínio real nunca aceita override.
    expect(
      agencyHostFromLocation("vitrine.tur.br", "?__agency_host=casanovatur.demo.local"),
    ).toBeNull();
  });

  it("não colide com segmentos reservados da plataforma", () => {
    for (const seg of [
      "gestao",
      "ofertas",
      "orcamento",
      "roteiro",
      "carteira",
      "fatura",
      "auth",
      "login",
      "lp",
      "c",
      "admin",
      "planos",
      "blog",
      "agende",
      "comunidade",
      "dashboard",
      "sitelab-base",
      "criar-cartao",
      "ativar-cartao",
      "reset-password",
    ]) {
      expect(isValidAgencySlug(seg)).toBe(false);
      expect(parseAgencySlugLocation("vitrine.tur.br", `/${seg}`)).toBeNull();
    }
    expect(isValidAgencySlug("casa-nova-tur")).toBe(true);
  });

  it("noindex apenas em áreas privadas/técnicas", () => {
    for (const path of ["/", "/ofertas", "/politicasdeprivacidade", "/termosdeuso"]) {
      expect(shouldNoindexAgencyPath("vitrine.tur.br", path)).toBe(false);
    }
    for (const path of [
      "/gestao",
      "/gestao/reservas",
      "/area-do-cliente",
      "/orcamento/ABC",
      "/roteiro/ABC",
      "/carteira/ABC",
      "/fatura/ABC",
      "/preview",
    ]) {
      expect(shouldNoindexAgencyPath("vitrine.tur.br", path)).toBe(true);
    }
    // Host técnico compartilhado: sempre noindex.
    expect(shouldNoindexAgencyPath("sites.agentesdesonhos.com.br", "/")).toBe(true);
  });
});
