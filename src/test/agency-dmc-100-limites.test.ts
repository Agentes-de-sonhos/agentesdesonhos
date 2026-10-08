import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveDmc, resolveHeroSlides, resolveSections } from "@/lib/agencySiteConfig";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { siteNavLinks } from "@/components/whitelabel/AgencySiteLayout";

const dmcSource = readFileSync("src/components/whitelabel/AgencyDmcSection.tsx", "utf8");
const homeSource = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");

describe("seção DMC da 100 Limites", () => {
  it("usa apresentação clara e a nova foto somente nos hosts configurados", () => {
    for (const hostname of ["100limites.tur.br", "www.100limites.tur.br"]) {
      const dmc = resolveDmc(hostname);
      expect(dmc?.presentation?.surface).toBe("light");
      expect(dmc?.presentation?.imageUrl).toContain("dmc-acolhimento-lisboa.jpg");
      expect(dmc?.title).toBe("DMC em Portugal");
      expect(dmc?.kicker).toBe("TAMBÉM EM PORTUGAL · DMC");
      expect(dmc?.cta).toBe("Solicitar orçamento em Portugal");
      expect(dmc?.services.map((service) => service.label)).toEqual([
        "Transfers privativos",
        "Passeios e experiências",
        "Roteiros personalizados",
        "Acompanhamento local",
      ]);
      expect(dmc?.whatsappMessage).toContain("Olá, Amanda!");
    }
    expect(resolveDmc("paraisoviagens.com")).toBeNull();
    expect(resolveDmc("destinoscomaju.com.br")).toBeNull();
  });

  it("usa um perfil editorial completo e isolado para passageiros e agências", () => {
    const profile = resolveSiteProfile("100limites.tur.br");
    expect(profile.key).toBe("editorialDmc");
    expect(profile.heroPresentation?.kicker).toBe("AGÊNCIA DE VIAGENS · BRASIL E MUNDO");
    expect(profile.hero).toHaveLength(3);
    expect(profile.hero?.map((slide) => slide.image)).toEqual(["brasil", "parques", "amanda100Limites"]);
    expect(profile.hero?.[2]).toMatchObject({ focalPoint: "amandaRight", textWidth: "narrowLeft" });
    expect(profile.requestCenter?.notice).toContain("Cada solicitação é analisada pela Amanda");
    expect(profile.destinations?.map((destination) => destination.title)).toEqual([
      "Brasil e Nordeste", "Europa e Portugal", "Orlando e parques", "Caribe e México", "América do Sul",
    ]);
    expect(profile.highlights?.map((highlight) => highlight.title)).toEqual([
      "Viagens em família", "Lua de mel", "Entre amigos",
    ]);
    expect(profile.about?.facts).toEqual([
      "100 Limites desde 2015",
      "Mais de 20 anos de experiência da Amanda no turismo",
    ]);
    expect(profile.about?.images?.[0]?.src).toContain("amanda-larini-perfil.png");
    expect(profile.footer?.description).toContain("DMC em Portugal para agências parceiras.");
    expect(profile.footer?.address).toBe("Lisboa, Portugal");
    expect(profile.navDensity).toBe("compact");
    expect(resolveSiteProfile("paraisoviagens.com").key).toBe("luxuryCurated");
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
  });

  it("mantém o menu do portfólio (com submenus) e oculta campanhas genéricas", () => {
    const links = siteNavLinks("100limites.tur.br");
    expect(links.map((l) => l.label)).toEqual([
      "Sobre", "Viagens", "DMC em Portugal", "Visto americano", "Área do cliente",
    ]);
    expect(links.find((l) => l.label === "DMC em Portugal")?.children?.map((c) => c.to)).toEqual([
      "/dmc-portugal", "/dmc-portugal#servicos", "/dmc-portugal#frota", "/dmc-portugal#lisboa", "/dmc-portugal#portugal",
      "/dmc-portugal#grupos", "/dmc-portugal#europa", "/dmc-portugal#pet-friendly", "/dmc-portugal#contato",
    ]);
    expect(resolveSections(resolveSiteProfile("100limites.tur.br").sections).map((section) => section.key))
      .not.toContain("modules");
    expect(resolveSections(resolveSiteProfile("paraisoviagens.com").sections).map((section) => section.key))
      .toContain("modules");
  });

  it("resolve imagens variadas por banner sem alterar o fallback compartilhado", () => {
    const profile = resolveSiteProfile("100limites.tur.br");
    const images = { brasil: "/brasil.jpg", parques: "/parques.jpg", amanda100Limites: "/amanda.png" };
    expect(resolveHeroSlides("100 Limites", null, profile.hero, "/fallback.jpg", images).map((slide) => slide.image))
      .toEqual(["/brasil.jpg", "/parques.jpg", "/amanda.png"]);
    expect(resolveHeroSlides("Outra", null, undefined, "/fallback.jpg").every((slide) => slide.image === "/fallback.jpg"))
      .toBe(true);
  });

  it("não publica portfólio, PDF, orçamento gratuito ou localização antiga", () => {
    const source = JSON.stringify(resolveSiteProfile("100limites.tur.br"));
    expect(source).not.toContain("Conhecer nosso portfólio");
    expect(source).not.toContain("PDF");
    expect(source).not.toContain("gratuit");
    expect(source).not.toContain("Palhoça");
  });

  it("mantém o layout e adapta contraste, foto e transição ao fundo claro", () => {
    expect(dmcSource).toContain('lightSurface ? "bg-card text-foreground"');
    expect(dmcSource).toContain("config.presentation?.imageUrl ?? destinoEuropa");
    expect(dmcSource).toContain("{!lightSurface && (");
    expect(dmcSource).toContain("text-card");
    expect(homeSource).toContain('dmc?.presentation?.surface === "light"');
  });

  it("alterna branco real e degradê apenas na 100 Limites, na ordem solicitada", () => {
    for (const host of ["100limites.tur.br", "www.100limites.tur.br"]) {
      const profile = resolveSiteProfile(host);
      expect(profile.alternateSurfaces).toBe(true);
      const keys = resolveSections(profile.sections).map((section) => section.key)
        .filter((key) => ["dmc", "destinations", "orlando", "highlights", "resorts", "about", "differentials", "concierge", "faq", "newsletter"].includes(key));
      expect(keys).toEqual(["dmc", "destinations", "orlando", "highlights", "resorts", "about", "differentials", "concierge", "faq", "newsletter"]);
    }
    expect(homeSource).toContain('gradient ? "wl-alt-gradient" : "bg-card"');
    expect(homeSource).toContain('key={`${section.key}-offset`} className="bg-card"');
    for (const host of ["destinoscomaju.com.br", "paraisoviagens.com", "casanovatur.com.br"]) {
      expect(resolveSiteProfile(host).alternateSurfaces).not.toBe(true);
    }
  });
});