import { describe, expect, it } from "vitest";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isUniversalLandingEnabled } from "@/lib/universalLandingAccess";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
describe("Innovati official domains", () => {
  it.each(["innovati.tur.br", "www.innovati.tur.br"])("%s uses the Mundo model without demo", (h) => {
    const p = resolveSiteProfile(h);
    expect(p.key).toBe("innovatiOfficial");
    expect(p.demo).toBe(false);
    expect(siteThemeRootClass(h)).toContain("wl-innovati-official");
    expect(isUniversalLandingEnabled(h)).toBe(true);
  });
  it("exibe seis destaques na ordem aprovada, com Iberostar exato e MSC separado de Disney", () => {
    const p = resolveSiteProfile("www.innovati.tur.br");
    const cards = p.destinations!;
    expect(p.destinationsFixedOrder).toBe(true);
    expect(cards.map((d) => d.title)).toEqual([
      "Iberostar Waves Bahia", "Cruzeiros Disney", "Serra Gaúcha", "Cruzeiros MSC", "Orlando", "Expedição Jalapão",
    ]);
    expect(cards[0].href).toBe("/resorts-brasil/iberostar-bahia");
    expect(cards[3].href).toBe("/cruzeiros/msc/msc-seaview");
    expect(cards[4].href).toBe("/ingressos-orlando");
    expect(cards[5]).toMatchObject({ service: "pacotes", ctaLabel: "Consultar roteiro" });
    expect(p.destinationCredits?.some((credit) => credit.author === "JcPietro")).toBe(true);
    expect(resolveSiteProfile("briefing-24-v1.preview.local").destinations).toHaveLength(5);
  });
  it("não habilita a Universal na prévia ou em outro domínio", () => {
    expect(isUniversalLandingEnabled("briefing-24-v1.preview.local")).toBe(false);
    expect(isUniversalLandingEnabled("innovati.tur.br.example.org")).toBe(false);
  });
});
describe("Shopping Viagens official domains", () => {
  it.each(["shoppingviagens.com.br", "www.shoppingviagens.com.br"])("%s uses the Mundo model without demo", (h) => {
    const p = resolveSiteProfile(h);
    expect(p.key).toBe("shoppingOfficial");
    expect(p.demo).toBe(false);
    expect(siteThemeRootClass(h)).toContain("wl-shopping-mundo");
  });
});
