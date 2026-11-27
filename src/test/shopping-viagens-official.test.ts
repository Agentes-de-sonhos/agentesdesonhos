import { describe, expect, it } from "vitest";
import { SHOPPING_PREVIEW_INFO, SHOPPING_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveAgencyHeaderBrandPreset, resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

describe("Shopping Viagens official site", () => {
  it.each(["shoppingviagens.com.br", "www.shoppingviagens.com.br"])("uses the account's registered logo on %s", hostname => {
    const logo = "https://cdn.example.com/shopping/logo.jpg";
    const profile = resolveSiteProfile(hostname);
    expect(profile.key).toBe("shoppingOfficial");
    expect(profile.textualWordmark).toBe(false);
    expect(resolveAgencyLogoUrl({ ...SHOPPING_PREVIEW_INFO, hostname, logo_url: logo })).toBe(logo);
    expect(resolveAgencyHeaderBrandPreset(hostname).logoOnly).toBe(true);
  });

  it("hides only the requested block and leaves no links to its former anchor", () => {
    const profile = resolveSiteProfile("shoppingviagens.com.br");
    expect(profile.sections).toEqual({ ...SHOPPING_PREVIEW_PROFILE.sections, modules: { enabled: false } });
    const links = profile.nav?.flatMap(item => [item, ...(item.children ?? [])]).map(item => item.to);
    expect(links).not.toContain("/#campanhas");
    expect(links).toEqual(expect.arrayContaining(["/#resorts", "/#autoridade", "/#faq"]));
    expect(SHOPPING_PREVIEW_PROFILE.sections?.modules?.enabled).toBe(true);
    expect(SHOPPING_PREVIEW_PROFILE.textualWordmark).toBe(true);
  });
});
