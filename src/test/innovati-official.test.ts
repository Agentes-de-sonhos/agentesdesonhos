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
