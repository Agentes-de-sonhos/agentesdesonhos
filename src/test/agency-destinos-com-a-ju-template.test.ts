import { describe, it, expect } from "vitest";
import { resolveSiteTheme, siteThemeRootClass, isEditorialTheme } from "@/lib/agencySiteTheme";
import { resolveProfileKey, resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isUnderConstruction } from "@/lib/agencySiteStatus";
import { resolveDmc, resolveSections } from "@/lib/agencySiteConfig";
import { resolveAgencyLogoOverride } from "@/lib/agencySiteBrand";

const JU_HOSTS = ["destinoscomaju.com.br", "www.destinoscomaju.com.br"];
const LIMITES = "100limites.tur.br";

describe("Destinos com a Ju — template estrutural da 100 Limites com identidade rosé", () => {
  it("renderiza a home completa (sem página temporária)", () => {
    for (const host of JU_HOSTS) expect(isUnderConstruction(host)).toBe(false);
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
    expect(resolveAgencyLogoOverride("paraisoviagens.com")).toBeNull();
  });

  it("não altera os demais tenants", () => {
    expect(resolveSiteTheme(LIMITES)).toBe("travelEditorial");
    expect(resolveSiteTheme("paraisoviagens.com")).toBe("luxuryEditorial");
    expect(isUnderConstruction(LIMITES)).toBe(true);
    expect(isUnderConstruction("paraisoviagens.com")).toBe(true);
  });
});
