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
      expect(dmc?.presentation?.imageUrl).toContain("dmc-cristiane-portugal.jpg");
      expect(dmc?.title).toBe("Sua DMC em Portugal");
      expect(dmc?.kicker).toBe("PARA AGÊNCIAS DE VIAGENS");
      expect(dmc?.cta).toBe("Solicitar cotação para minha agência");
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
    expect(profile.heroPresentation?.kicker).toBe("VIAGENS PERSONALIZADAS · BRASIL E MUNDO");
    expect(profile.hero).toHaveLength(3);
    expect(profile.hero?.map((slide) => slide.image)).toEqual(["brasil", "parques", "europa"]);
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
    expect(profile.about?.media).toBe("hidden");
    expect(profile.footer?.description).toContain("DMC em Portugal para agências parceiras.");
    expect(resolveSiteProfile("paraisoviagens.com").key).toBe("luxuryCurated");
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
  });

  it("mantém Para agências no menu desktop/mobile e oculta campanhas genéricas", () => {
    const links = siteNavLinks("100limites.tur.br");
    expect(links).toContainEqual({ label: "Para agências", to: "/#dmc-agencias" });
    expect(resolveSections(resolveSiteProfile("100limites.tur.br").sections).map((section) => section.key))
      .not.toContain("modules");
    expect(resolveSections(resolveSiteProfile("paraisoviagens.com").sections).map((section) => section.key))
      .toContain("modules");
  });

  it("resolve imagens variadas por banner sem alterar o fallback compartilhado", () => {
    const profile = resolveSiteProfile("100limites.tur.br");
    const images = { brasil: "/brasil.jpg", parques: "/parques.jpg", europa: "/europa.jpg" };
    expect(resolveHeroSlides("100 Limites", null, profile.hero, "/fallback.jpg", images).map((slide) => slide.image))
      .toEqual(["/brasil.jpg", "/parques.jpg", "/europa.jpg"]);
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
});