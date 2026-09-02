import { describe, expect, it } from "vitest";
import { resolveProfileKey, resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isEditorialTheme, isLuxuryTheme, resolveSiteTheme, siteThemeRootClass } from "@/lib/agencySiteTheme";
import { resolveSections } from "@/lib/agencySiteConfig";
import {
  isUnderConstruction,
  isRouteGatedByStatus,
  shouldRenderUnderConstruction,
  resolveConstructionVariant,
} from "@/lib/agencySiteStatus";
import { logoIncludesWordmark, resolveAgencyLogoOverride } from "@/lib/agencySiteBrand";

const FAE_HOSTS = ["faeviagens.com.br", "www.faeviagens.com.br"];

describe("tenant Faé Viagens", () => {
  it("resolve perfil, tema e classe raiz exclusivos", () => {
    for (const host of FAE_HOSTS) {
      expect(resolveProfileKey(host)).toBe("faeCurated");
      expect(resolveSiteTheme(host)).toBe("faeEditorial");
      expect(siteThemeRootClass(host)).toBe("wl-editorial wl-fae");
      expect(isEditorialTheme(host)).toBe(true);
      expect(isLuxuryTheme(host)).toBe(false);
    }
  });

  it("usa a ordem editorial definida e desliga seções sem conteúdo factual", () => {
    const profile = resolveSiteProfile("faeviagens.com.br");
    const order = resolveSections(profile.sections).map((s) => s.key);
    expect(order).toEqual([
      "signature",
      "destinations",
      "modules",
      "highlights",
      "differentials",
      "about",
      "concierge",
      "faq",
      "newsletter",
      "offers",
    ]);
    expect(order).not.toContain("dmc");
    expect(order).not.toContain("testimonials");
    expect(order).not.toContain("team");
    expect(order).not.toContain("credentials");
  });

  it("traz conteúdo próprio consistente", () => {
    const profile = resolveSiteProfile("www.faeviagens.com.br");
    expect(profile.hero).toHaveLength(3);
    expect(profile.destinations).toHaveLength(5);
    expect(profile.modules).toHaveLength(8);
    expect(profile.highlights).toHaveLength(3);
    expect(profile.differentials).toHaveLength(4);
    expect(profile.faq).toHaveLength(5);
    expect(profile.about?.badge?.value).toBe("Desde 2003");
    expect(profile.heroImage).toBe("fae");
  });

  it("usa o logotipo oficial e não repete o nome ao lado dele", () => {
    for (const host of FAE_HOSTS) {
      expect(resolveAgencyLogoOverride(host)).toContain("logo-fae-viagens.png");
      expect(logoIncludesWordmark(host)).toBe(true);
    }
    expect(logoIncludesWordmark("destinoscomaju.com.br")).toBe(false);
    expect(logoIncludesWordmark("100limites.tur.br")).toBe(false);
  });

  it("fica em construção na home, com bypass técnico de preview", () => {
    for (const host of FAE_HOSTS) {
      expect(isUnderConstruction(host)).toBe(true);
      expect(resolveConstructionVariant(host)).toBe("default");
      expect(isRouteGatedByStatus("/", host)).toBe(true);
      for (const path of ["/orcamento/abc", "/roteiro/abc", "/carteira/abc", "/fatura/abc", "/ofertas", "/area-do-cliente"]) {
        expect(isRouteGatedByStatus(path, host)).toBe(false);
      }
      expect(
        shouldRenderUnderConstruction(host, "id-preview--x.lovable.app", "?__agency_preview=1"),
      ).toBe(false);
      expect(shouldRenderUnderConstruction(host, host, "?__agency_preview=1")).toBe(true);
    }
  });

  it("não altera os tenants existentes", () => {
    expect(resolveProfileKey("paraisoviagens.com")).toBe("luxuryCurated");
    expect(resolveProfileKey("destinoscomaju.com.br")).toBe("editorialRose");
    expect(resolveProfileKey("100limites.tur.br")).toBe("editorialDmc");
    expect(siteThemeRootClass("100limites.tur.br")).toBe("wl-editorial");
  });
});
