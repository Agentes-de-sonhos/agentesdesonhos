import { describe, it, expect } from "vitest";
import { isUnderConstruction, resolveHomeSurface } from "@/lib/agencySiteStatus";
import { canonicalRedirectHost } from "@/lib/agencySiteContacts";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isTenantPasswordProtected } from "@/lib/agencySitePassword";

const MUNDO_HOSTS = ["omundoemcores.com.br", "www.omundoemcores.com.br"];
const MUNDO_OWNER = "428500de-552a-411b-9663-71f8bb2e4f37";

describe("O Mundo em Cores — site completo no domínio, com senha", () => {
  it("o domínio mostra o site completo, não a página em construção", () => {
    for (const host of MUNDO_HOSTS) {
      expect(isUnderConstruction(host), host).toBe(false);
      expect(resolveHomeSurface(host), host).toBe("site_home");
      expect(resolveSiteProfile(host).key, host).toBe("mundoEmCoresBriefing14");
    }
  });

  it("o site é protegido por senha", () => {
    expect(isTenantPasswordProtected(MUNDO_OWNER)).toBe(true);
  });

  it("não afeta outros tenants", () => {
    expect(resolveSiteProfile("100limites.tur.br").key).not.toContain("mundo");
  });

  it("redirecionamento canônico para www", () => {
    expect(canonicalRedirectHost("omundoemcores.com.br")).toBe("www.omundoemcores.com.br");
    expect(canonicalRedirectHost("www.omundoemcores.com.br")).toBeNull();
  });
});

import { siteThemeRootClass } from "@/lib/agencySiteTheme";
describe("O Mundo em Cores — domínio usa o visual aprovado", () => {
  it("aplica tema editorial wl-mundo nos dois hosts", () => {
    for (const h of ["omundoemcores.com.br", "www.omundoemcores.com.br"]) expect(siteThemeRootClass(h)).toContain("wl-mundo");
  });
});
