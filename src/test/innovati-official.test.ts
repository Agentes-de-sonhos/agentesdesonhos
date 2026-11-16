import { describe, expect, it } from "vitest";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
describe("Innovati official domains", () => {
  it.each(["innovati.tur.br", "www.innovati.tur.br"])("%s uses the Mundo model without demo", (h) => {
    const p = resolveSiteProfile(h);
    expect(p.key).toBe("innovatiOfficial");
    expect(p.demo).toBe(false);
    expect(siteThemeRootClass(h)).toContain("wl-innovati-mundo");
  });
});
