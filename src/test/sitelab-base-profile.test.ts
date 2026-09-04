import { describe, expect, it } from "vitest";
import { resolveProfileKey, resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isEditorialTheme, isLuxuryTheme, resolveSiteTheme, siteThemeRootClass } from "@/lib/agencySiteTheme";
import { resolveSections } from "@/lib/agencySiteConfig";
import { resolveAgencyLogoOverride } from "@/lib/agencySiteBrand";
import { SITELAB_DEMO_HOSTNAME } from "@/lib/sitelabModels";

const HOST = SITELAB_DEMO_HOSTNAME;

describe("SiteLab Base — perfil e tema próprios", () => {
  it("resolve profile siteLabBase e tema editorial neutro (nunca classic)", () => {
    expect(HOST).toBe("sitelab.local");
    expect(resolveProfileKey(HOST)).toBe("siteLabBase");
    expect(resolveSiteTheme(HOST)).toBe("siteBaseEditorial");
    expect(resolveSiteTheme(HOST)).not.toBe("classic");
    expect(resolveSiteTheme(HOST)).not.toBe("faeEditorial");
    expect(siteThemeRootClass(HOST)).toBe("wl-editorial wl-site-base");
    expect(isEditorialTheme(HOST)).toBe(true);
    expect(isLuxuryTheme(HOST)).toBe(false);
  });

  it("é superconjunto editorial do preset curado (catálogo mestre)", () => {
    const sitelab = resolveSiteProfile(HOST);
    const fae = resolveSiteProfile("faeviagens.com.br");
    const order = (p: typeof sitelab) => resolveSections(p.sections).map((s) => s.key);
    const labOrder = order(sitelab);
    // Todas as seções da Faé existem no laboratório e na mesma ordem relativa.
    expect(order(fae).every((k) => labOrder.includes(k))).toBe(true);
    expect(labOrder.filter((k) => order(fae).includes(k))).toEqual(order(fae));
    expect(labOrder.length).toBeGreaterThan(order(fae).length);
    expect(sitelab.modules?.map((m) => m.key)).toContain("roteiros-sob-medida");
    expect(sitelab.destinations?.length).toBeGreaterThan(3);
    expect(sitelab.heroImage).not.toBe("fae");
  });

  it("não contém conteúdo da Faé nem alegações factuais", () => {
    const text = JSON.stringify(resolveSiteProfile(HOST)).toLowerCase();
    for (const term of ["faé", "fae ", "2003", "desde 20", "cnpj", "abav"]) {
      expect(text).not.toContain(term);
    }
  });

  it("não resolve logotipo por hostname (asset próprio do laboratório)", () => {
    expect(resolveAgencyLogoOverride(HOST)).toBeNull();
  });

  it("mantém os tenants existentes inalterados", () => {
    expect(resolveProfileKey("faeviagens.com.br")).toBe("faeCurated");
    expect(resolveSiteTheme("www.faeviagens.com.br")).toBe("faeEditorial");
    expect(siteThemeRootClass("faeviagens.com.br")).toBe("wl-editorial wl-fae");
    expect(resolveProfileKey("100limites.tur.br")).toBe("editorialDmc");
    expect(resolveSiteTheme("paraisoviagens.com")).toBe("luxuryEditorial");
    expect(resolveProfileKey("destinoscomaju.com.br")).toBe("editorialRose");
    expect(resolveProfileKey("outra-agencia.com.br")).toBe("classic");
  });
});
