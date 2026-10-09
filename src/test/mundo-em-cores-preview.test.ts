import { describe, expect, it } from "vitest";
import { MUNDO_EM_CORES_PREVIEW_PROFILE as profile, MUNDO_EM_CORES_PREVIEW_INFO as info, MUNDO_EM_CORES_PREVIEW_HOST as host, DRICA_VIAGENS_PREVIEW_PROFILE, VIAJAR_TIRISMO_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";

describe("O Mundo em Cores approved isolated presentation", () => {
  it("uses professional experience without inventing a founding date", () => {
    expect(profile.about?.badge).toEqual({ value: "29 anos", label: "de experiência no turismo" });
    expect(profile.about?.title).toBe("29 anos colorindo vidas com viagens.");
    expect(JSON.stringify(profile)).not.toMatch(/30 anos|27 anos|2012|2017|antecipação|curadoria|jornada|Vinculação de domínio/i);
    expect(profile.about?.text).toContain("Olá, eu sou a Vanessa Figueiredo.");
  });
  it("preserves safe synthetic identity and uses opt-in shared visuals", () => {
    expect(profile.alternateSurfaces).toBe(true);
    expect(profile.campaignCardPresentation).toBe("photoAbove");
    expect(siteThemeRootClass(host)).toContain("wl-mundo");
    expect(info.primary_color).toBe("#245C81");
    expect(info.phone).toBeNull();
    expect(info.agency_slug).toBe("");
    expect(info.public_slug).toBeNull();
    for (const other of ["www.destinoscomaju.com.br", "100limites.tur.br", "briefing-16-v1.preview.local", "briefing-17-v1.preview.local"]) {
      expect(siteThemeRootClass(other)).not.toContain("wl-mundo");
      expect(resolveSiteProfile(other).about?.visitedDestinations).toBeUndefined();
      expect(resolveSiteProfile(other).campaignCardPresentation).toBeUndefined();
    }
    expect(DRICA_VIAGENS_PREVIEW_PROFILE.sections?.testimonials).toEqual({ enabled: false });
    expect(VIAJAR_TIRISMO_PREVIEW_PROFILE.sections?.testimonials).toEqual({ enabled: false });
  });
  it("keeps exact approved testimonials and real media without invented ratings", () => {
    expect(profile.testimonials?.map(({ author, quote }) => [author, quote])).toEqual([
      ["Thaís Rosa", "competência, carinho, personalização, amor, dedicação"],
      ["Lucia Quintas", "sempre priorizando nossos desejos e conforto"],
      ["Raquel Macario", "minhas viagens sejam leves, agradáveis, com excelentes escolhas"],
    ]);
    expect(profile.about?.images?.[0].src).toContain("/__l5e/assets-v1/");
    expect(profile.about?.visitedDestinations?.names).toHaveLength(10);
    expect(profile.about?.visitedDestinations?.title).toBe("Destinos que já conheci");
    expect(profile.modules?.find(m => m.key === "elas-viajam")?.text).toBe("Experiências de viagem para mulheres. Converse com a Vanessa sobre propostas e próximas saídas.");
    expect(profile.hero?.[0].title).toBe("Sua próxima viagem, com as suas cores.");
    expect(profile.heroPresentation?.cta).toBeUndefined();
    expect(profile.hero?.[1].title).toBe("Uma viagem com a sua personalidade.");
    expect(profile.sections?.newsletter).toEqual({ enabled: true, order: 7 });
    expect(profile.socialStrip?.links[0].network).toBe("instagram");
  });
});