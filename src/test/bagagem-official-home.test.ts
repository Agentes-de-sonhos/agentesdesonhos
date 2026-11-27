import { describe, expect, it } from "vitest";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
import { isUniversalLandingEnabled } from "@/lib/universalLandingAccess";
import { whatsappGroupUrlFor } from "@/components/whitelabel/WhatsappGroupInvite";
import { BRAZIL_RESORTS } from "@/components/resorts-brasil/resortsData";

describe("Bagagem na Mão no domínio oficial", () => {
  it.each(["bagagemnamao.com.br", "www.bagagemnamao.com.br"])("aplica os ajustes somente a %s", (host) => {
    const profile = resolveSiteProfile(host);
    expect(profile.key).toBe("bagagemNaMaoOfficial");
    expect(siteThemeRootClass(host)).toContain("wl-bagagem-official");
    expect(profile.hero).toHaveLength(3);
    expect(profile.heroPresentation?.actionsPlacement).toBe("right");
    expect(profile.requestCenter).toMatchObject({ title: "O que você deseja planejar?", submitLabel: "Solicitar" });
    expect(profile.sections?.modules?.enabled).toBe(false);
    expect(profile.sections?.newsletter?.enabled).toBe(true);
    expect(profile.newsletterMedia?.src).toMatch(/marcia-cruzeiro/);
    expect(profile.socialStrip?.links).toContainEqual({ network: "instagram", url: "https://www.instagram.com/bagagemnamaoviagens/" });
    expect(isUniversalLandingEnabled(host)).toBe(true);
    expect(profile.destinations?.find((item) => item.key === "canada")?.image).toBe("bagagemCanada");
    expect(profile.destinations?.find((item) => item.key === "resorts-all-inclusive")).toMatchObject({ title: "Iberostar Waves Bahia", href: "/resorts-brasil/iberostar-bahia" });
    expect(BRAZIL_RESORTS.some(({ slug }) => slug === "iberostar-bahia")).toBe(true);
    expect(profile.authority?.companies?.items).toHaveLength(5);
    expect(profile.whatsappChannels).toBeUndefined();
    expect(whatsappGroupUrlFor(host)).toBeNull();
  });

  it("não altera a prévia antiga nem habilita Universal nela", () => {
    const host = "briefing-19-v1.preview.local";
    expect(resolveSiteProfile(host).sections?.newsletter?.enabled).toBe(false);
    expect(resolveSiteProfile(host).whatsappChannels?.group).toBeTruthy();
    expect(siteThemeRootClass(host)).not.toContain("wl-bagagem-official");
    expect(isUniversalLandingEnabled(host)).toBe(false);
  });
});
