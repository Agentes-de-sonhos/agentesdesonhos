import { describe, it, expect } from "vitest";
import { resolveProfileKey, resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme, siteThemeRootClass, isEditorialTheme, isLuxuryTheme } from "@/lib/agencySiteTheme";
import { resolveSections, resolveModules, resolveDestinations, resolveHeroSlides } from "@/lib/agencySiteConfig";
import { isConstructionPreviewBypass, shouldRenderUnderConstruction } from "@/lib/agencySiteStatus";

describe("perfis white label por hostname", () => {
  it("mapeia 100 Limites para editorialDmc e Paraíso para luxuryCurated", () => {
    expect(resolveProfileKey("100limites.tur.br")).toBe("editorialDmc");
    expect(resolveProfileKey("WWW.100LIMITES.TUR.BR")).toBe("editorialDmc");
    expect(resolveProfileKey("paraisoviagens.com")).toBe("luxuryCurated");
    expect(resolveProfileKey("www.paraisoviagens.com:443")).toBe("luxuryCurated");
    expect(resolveProfileKey("outraagencia.com.br")).toBe("classic");
  });

  it("mantém o tema da 100 Limites e adiciona luxuryEditorial na Paraíso", () => {
    expect(resolveSiteTheme("100limites.tur.br")).toBe("travelEditorial");
    expect(siteThemeRootClass("100limites.tur.br")).toBe("wl-editorial");
    expect(resolveSiteTheme("paraisoviagens.com")).toBe("luxuryEditorial");
    expect(siteThemeRootClass("paraisoviagens.com")).toBe("wl-editorial wl-luxury");
    expect(siteThemeRootClass("outraagencia.com.br")).toBe("");
    expect(isEditorialTheme("paraisoviagens.com")).toBe(true);
    expect(isLuxuryTheme("100limites.tur.br")).toBe(false);
  });

  it("perfil classic não muda nada nos defaults compartilhados", () => {
    expect(resolveSiteProfile("outraagencia.com.br").sections).toBeUndefined();
    expect(resolveSections()).toEqual(resolveSections({}));
  });
});

describe("ordem e conteúdo da home Paraíso", () => {
  const profile = resolveSiteProfile("paraisoviagens.com");

  it("ordena as seções conforme o briefing, sem DMC, equipe ou depoimentos", () => {
    const keys = resolveSections({ ...profile.sections, dmc: false }).map((s) => s.key);
    expect(keys).toEqual([
      "signature",
      "destinations",
      "modules",
      "highlights",
      "differentials",
      "about",
      "credentials",
      "concierge",
      "faq",
      "newsletter",
      "offers",
    ]);
  });

  it("usa conteúdo do perfil em destinos, coleções e FAQ", () => {
    const destinations = resolveDestinations(undefined, profile.destinations);
    expect(destinations.map((d) => d.key)).toEqual([
      "safari", "douro", "cruzeiros-premium", "villas", "brasil",
    ]);
    const modules = resolveModules(undefined, profile.modules);
    expect(modules[0].key).toBe("hoteis-villas");
    expect(modules).toHaveLength(8);
    expect(profile.faq).toHaveLength(5);
    // Nunca preço ou promessa comercial nas inspirações.
    for (const d of destinations) {
      expect(`${d.title} ${d.text}`).not.toMatch(/R\$|desconto|promo/i);
    }
  });

  it("hero traz 3 slides do perfil com o nome real da agência", () => {
    const slides = resolveHeroSlides("Paraíso Viagens", null, profile.hero, "hero.jpg");
    expect(slides).toHaveLength(3);
    expect(slides[0].title).toBe("Viagens extraordinárias começam nos detalhes");
    expect(slides[2].subtitle).toContain("Paraíso Viagens");
    expect(slides[2].subtitle).not.toContain("{agency}");
  });

  it("história é factual e não atribui a fundação a Mariana e Daniela", () => {
    const text = `${profile.about?.title} ${profile.about?.text}`;
    expect(text).toContain("1997");
    expect(text).toMatch(/Mariana e Daniela/);
    expect(text).not.toMatch(/fundaram|Grupo Paraíso|Paraíso Seguros/i);
  });

  it("credenciais citam apenas Luxperts", () => {
    expect(profile.credentials?.items.map((i) => i.key)).toEqual(["luxperts"]);
  });

  it("newsletter usa linguagem de inspiração, sem promoção", () => {
    const copy = profile.copy?.newsletter;
    expect(copy?.title).toBe("Receba inspirações para a sua próxima viagem");
    expect(`${copy?.title} ${copy?.subtitle} ${copy?.cta}`).not.toMatch(/promo|desconto|liquida/i);
  });
});

describe("bypass de preview da home em construção", () => {
  const search = "?__agency_host=paraisoviagens.com&__agency_preview=1";

  it("libera apenas no hostname técnico de preview do Lovable", () => {
    expect(isConstructionPreviewBypass("id-preview--abc.lovable.app", search)).toBe(true);
    expect(isConstructionPreviewBypass("preview--abc.lovable.app", search)).toBe(true);
  });

  it("nunca libera no domínio da agência nem no domínio publicado", () => {
    for (const host of [
      "paraisoviagens.com",
      "www.paraisoviagens.com",
      "100limites.tur.br",
      "agentedesonhoproject.lovable.app",
      "app.agentesdesonhos.com.br",
      "localhost",
    ]) {
      expect(isConstructionPreviewBypass(host, search), host).toBe(false);
      expect(shouldRenderUnderConstruction("paraisoviagens.com", host, search), host).toBe(true);
    }
  });

  it("exige o parâmetro explícito", () => {
    expect(isConstructionPreviewBypass("id-preview--abc.lovable.app", "?__agency_host=paraisoviagens.com")).toBe(false);
    expect(
      shouldRenderUnderConstruction("paraisoviagens.com", "id-preview--abc.lovable.app", search),
    ).toBe(false);
    // Tenants liberados nunca são afetados pelo bypass.
    expect(shouldRenderUnderConstruction("outraagencia.com.br", "outraagencia.com.br", "")).toBe(false);
  });
});
