import { describe, it, expect } from "vitest";
import { resolveSiteTheme, siteThemeRootClass, isEditorialTheme } from "@/lib/agencySiteTheme";
import { resolveProfileKey, resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isUnderConstruction } from "@/lib/agencySiteStatus";
import { resolveDmc, resolveSections } from "@/lib/agencySiteConfig";
import { resolveAgencyFaviconUrl, resolveAgencyLogoOverride } from "@/lib/agencySiteBrand";

const JU_HOSTS = ["destinoscomaju.com.br", "www.destinoscomaju.com.br"];
const LIMITES = "100limites.tur.br";

describe("Destinos com a Ju — template estrutural da 100 Limites com identidade rosé", () => {
  it("está em modo página em construção (decisão vigente), mantendo o template configurado", () => {
    for (const host of JU_HOSTS) expect(isUnderConstruction(host)).toBe(true);
  });


  it("usa a família de layout editorial com tokens rosé exclusivos", () => {
    for (const host of JU_HOSTS) {
      expect(resolveSiteTheme(host)).toBe("roseEditorial");
      expect(isEditorialTheme(host)).toBe(true);
      expect(siteThemeRootClass(host)).toBe("wl-editorial wl-rose");
    }
    expect(siteThemeRootClass(LIMITES)).toBe("wl-editorial");
  });

  it("replica a mesma estrutura/ordem de seções da 100 Limites", () => {
    const ju = resolveSections(resolveSiteProfile(JU_HOSTS[0]).sections).map((s) => s.key);
    const limites = resolveSections(resolveSiteProfile(LIMITES).sections).map((s) => s.key);
    expect(ju).toEqual(limites);
    expect(resolveProfileKey(JU_HOSTS[0])).toBe("editorialRose");
  });

  it("não herda conteúdo exclusivo (DMC) da 100 Limites", () => {
    for (const host of JU_HOSTS) expect(resolveDmc(host)).toBeNull();
  });

  it("aplica o logotipo oficial apenas nos hosts da agência", () => {
    for (const host of JU_HOSTS) expect(resolveAgencyLogoOverride(host)).toContain("logo-destinos-com-a-ju");
    expect(resolveAgencyLogoOverride(LIMITES)).toBeNull();
    // Paraíso tem o próprio logotipo oficial — nunca o da Ju.
    expect(resolveAgencyLogoOverride("paraisoviagens.com")).not.toContain("logo-destinos-com-a-ju");
  });

  it("usa o ícone próprio no favicon sem substituir o logotipo do site", () => {
    for (const hostname of JU_HOSTS) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-destinos-com-a-ju.png");
      expect(resolveAgencyLogoOverride(hostname)).toContain("logo-destinos-com-a-ju-2026.png");
    }
  });

  it("usa o ícone próprio da Paraíso sem substituir o logotipo visível", () => {
    for (const hostname of ["paraisoviagens.com", "www.paraisoviagens.com"]) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-paraiso-viagens.png");
      expect(resolveAgencyLogoOverride(hostname)).toContain("logo-paraiso-viagens.png");
    }
  });

  it("usa a bússola oficial como favicon da Essya Tur sem trocar o logotipo do site", () => {
    for (const hostname of ["essyatur.com.br", "www.essyatur.com.br"]) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-essya-tur.png");
    }
    expect(resolveAgencyLogoOverride("www.essyatur.com.br")).toBeNull();
  });

  it("usa o pin vermelho oficial como favicon da 100 Limites", () => {
    for (const hostname of ["100limites.tur.br", "www.100limites.tur.br"]) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-100-limites-2.png");
    }
    expect(resolveAgencyLogoOverride("100limites.tur.br")).toBeNull();
  });

  it("não altera os demais tenants", () => {
    expect(resolveSiteTheme(LIMITES)).toBe("travelEditorial");
    expect(resolveSiteTheme("paraisoviagens.com")).toBe("luxuryEditorial");
    expect(isUnderConstruction(LIMITES)).toBe(true);
    expect(isUnderConstruction("paraisoviagens.com")).toBe(true);
  });
});
