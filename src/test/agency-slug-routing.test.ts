import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  RESERVED_SLUG_SEGMENTS,
  SHARED_AGENCY_SITE_HOSTS,
  agencyRouteBasePath,
  isSharedAgencySiteHost,
  isValidAgencySlug,
  parseAgencySlugLocation,
  tenantRequestHostname,
  withAgencyBasePath,
} from "@/lib/agencySlugRouting";
import { isAgencyAdminPath } from "@/lib/agencyAdmin";
import { isAgencyPublicToolPath } from "@/lib/agencyPublicToolRoutes";
import { agencyAdminMount } from "@/lib/agencyAdmin";

const SHARED = "sites.agentesdesonhos.com.br";

describe("Host compartilhado: /{agency_slug}", () => {
  it("reconhece apenas o host compartilhado", () => {
    expect(SHARED_AGENCY_SITE_HOSTS).toContain(SHARED);
    expect(isSharedAgencySiteHost(SHARED)).toBe(true);
    expect(isSharedAgencySiteHost("SITES.AGENTESDESONHOS.COM.BR:8080")).toBe(true);
    expect(isSharedAgencySiteHost("casanovatur.com.br")).toBe(false);
    expect(isSharedAgencySiteHost("app.agentesdesonhos.com.br")).toBe(false);
  });

  it("extrai slug, prefixo e caminho interno de cada superfície", () => {
    const cases: [string, string][] = [
      ["/casa-nova-tur", "/"],
      ["/casa-nova-tur/", "/"],
      ["/casa-nova-tur/gestao", "/gestao"],
      ["/casa-nova-tur/gestao/reservas/123", "/gestao/reservas/123"],
      ["/casa-nova-tur/area-do-cliente", "/area-do-cliente"],
      ["/casa-nova-tur/area-do-cliente/viagens/abc", "/area-do-cliente/viagens/abc"],
      ["/casa-nova-tur/orcamento/ABC123", "/orcamento/ABC123"],
      ["/casa-nova-tur/roteiro/ABC123", "/roteiro/ABC123"],
      ["/casa-nova-tur/carteira/ABC123", "/carteira/ABC123"],
      ["/casa-nova-tur/fatura/ABC123", "/fatura/ABC123"],
    ];
    for (const [path, internal] of cases) {
      const parsed = parseAgencySlugLocation(SHARED, path);
      expect(parsed?.slug).toBe("casa-nova-tur");
      expect(parsed?.basePath).toBe("/casa-nova-tur");
      expect(parsed?.internalPath).toBe(internal);
    }
  });

  it("funciona igual em deep link, refresh e com query/hash", () => {
    const a = parseAgencySlugLocation(SHARED, "/agencia-x/roteiro/COD9?utm=abc#dia-3");
    expect(a?.internalPath).toBe("/roteiro/COD9");
    // Refresh = mesma URL processada novamente: resultado idêntico.
    expect(parseAgencySlugLocation(SHARED, "/agencia-x/roteiro/COD9?utm=abc#dia-3")).toEqual(a);
  });

  it("domínio próprio continua sem prefixo algum", () => {
    expect(parseAgencySlugLocation("casanovatur.com.br", "/gestao/reservas")).toBeNull();
    expect(agencyRouteBasePath("casanovatur.com.br", "/orcamento/ABC")).toBe("");
    expect(agencyRouteBasePath("id-preview--x.lovable.app", "/area-do-cliente")).toBe("");
  });
});

describe("Validação e isolamento do slug", () => {
  it("recusa segmentos reservados das superfícies", () => {
    for (const reserved of ["gestao", "area-do-cliente", "orcamento", "roteiro", "carteira", "fatura"]) {
      expect(RESERVED_SLUG_SEGMENTS.has(reserved)).toBe(true);
      expect(isValidAgencySlug(reserved)).toBe(false);
      expect(parseAgencySlugLocation(SHARED, `/${reserved}/ABC123`)).toBeNull();
    }
  });

  it("recusa slugs inválidos e não vaza tenant sem slug", () => {
    for (const bad of ["", "a", "-x", "x-", "Casa Nova", "casa_nova", "casa--nova", "a".repeat(61)]) {
      expect(isValidAgencySlug(bad)).toBe(false);
    }
    expect(isValidAgencySlug("casa-nova-tur")).toBe(true);
    expect(parseAgencySlugLocation(SHARED, "/")).toBeNull();
  });

  it("não confunde tenants: cada slug gera o seu próprio prefixo", () => {
    const a = parseAgencySlugLocation(SHARED, "/agencia-a/carteira/COD1")!;
    const b = parseAgencySlugLocation(SHARED, "/agencia-b/carteira/COD1")!;
    expect(a.slug).not.toBe(b.slug);
    expect(a.basePath).toBe("/agencia-a");
    expect(b.basePath).toBe("/agencia-b");
    expect(withAgencyBasePath(a.basePath, "/gestao")).toBe("/agencia-a/gestao");
    expect(withAgencyBasePath(b.basePath, "/gestao")).toBe("/agencia-b/gestao");
  });

  it("prefixa apenas uma vez (idempotente) e ignora links externos", () => {
    expect(withAgencyBasePath("/agencia-a", "/ofertas")).toBe("/agencia-a/ofertas");
    expect(withAgencyBasePath("/agencia-a", "/agencia-a/ofertas")).toBe("/agencia-a/ofertas");
    expect(withAgencyBasePath("/agencia-a", "/")).toBe("/agencia-a");
    expect(withAgencyBasePath("", "/ofertas")).toBe("/ofertas");
    expect(withAgencyBasePath("/agencia-a", "https://exemplo.com")).toBe("https://exemplo.com");
  });

  it("no host compartilhado o tenant das chamadas vem do registro resolvido", () => {
    expect(tenantRequestHostname(SHARED, "casanovatur.com.br", "sites.agentesdesonhos.com.br")).toBe(
      "casanovatur.com.br",
    );
    // Domínio próprio: comportamento atual preservado.
    expect(tenantRequestHostname("casanovatur.com.br", "outra.com.br", "casanovatur.com.br")).toBe(
      "casanovatur.com.br",
    );
  });
});

describe("Compatibilidade das rotas internas", () => {
  it("gestão e subrotas continuam reconhecidas após remover o prefixo", () => {
    const parsed = parseAgencySlugLocation(SHARED, "/agencia-x/gestao/financeiro")!;
    expect(isAgencyAdminPath(parsed.internalPath)).toBe(true);
    expect(isAgencyAdminPath(parseAgencySlugLocation(SHARED, "/agencia-x")!.internalPath)).toBe(false);
  });

  it("documentos públicos seguem exigindo código e ficam fora do shell", () => {
    const doc = parseAgencySlugLocation(SHARED, "/agencia-x/orcamento/COD123")!;
    expect(isAgencyPublicToolPath(doc.internalPath)).toBe(true);
    // Sem código não existe rota pública: nada é enumerável.
    const noCode = parseAgencySlugLocation(SHARED, "/agencia-x/orcamento")!;
    expect(isAgencyPublicToolPath(noCode.internalPath)).toBe(false);
  });

  it("login e rotas da gestão preservam o prefixo do tenant", () => {
    const mount = agencyAdminMount("/agencia-x");
    expect(mount.home).toBe("/agencia-x/gestao");
    expect(mount.login).toBe("/agencia-x/gestao/login");
    expect(mount.toInternal("/agencia-x/gestao/financeiro")).toBe("/gestao/financeiro");
    expect(mount.toExternal("/gestao/reservas")).toBe("/agencia-x/gestao/reservas");
    // Domínio próprio: prefixo vazio, comportamento atual.
    expect(agencyAdminMount(undefined).login).toBe("/gestao/login");
  });
});

describe("Roteador e resolução segura (código)", () => {
  const gate = readFileSync("src/components/routing/AgencyDomainGate.tsx", "utf8");
  const routes = readFileSync("src/components/routing/AgencyDomainRoutes.tsx", "utf8");
  const domains = readFileSync("src/lib/agencyDomains.ts", "utf8");
  const links = readFileSync("src/lib/agencyContextLink.ts", "utf8");

  it("resolve o tenant pelo slug no servidor e mantém o fluxo por hostname", () => {
    expect(domains).toContain('rpc("get_agency_by_slug"');
    expect(gate).toContain("fetchAgencyBySlug");
    expect(gate).toContain("fetchAgencyDomain");
    expect(gate).toContain("agencyHostFromLocation");
  });

  it("aplica o prefixo como basename do roteador", () => {
    expect(routes).toContain("basename={base || undefined}");
    expect(routes).toContain("basePath");
  });

  it("host técnico compartilhado é sempre noindex/nofollow", () => {
    expect(routes).toContain("useNoindex");
    expect(routes).toContain("shouldNoindexAgencyPath");
    expect(gate).toContain("useNoindex");
  });

  it("preview protegido e override ?__agency_host continuam existindo", () => {
    expect(routes).toContain('path="/preview"');
    expect(links).toContain("AGENCY_HOST_PARAM");
    expect(links).toContain("agencySiteHref");
  });

  it("não existe slug/agência embutido no roteamento", () => {
    for (const file of [gate, routes]) {
      expect(file).not.toMatch(/casa-nova|casanovatur/i);
    }
  });
});
