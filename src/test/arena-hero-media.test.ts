import { describe, expect, it } from "vitest";
import { ARENA_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveHeroSlides } from "@/lib/agencySiteConfig";

describe("optional per-slide attribution", () => {
  it("keeps the approved generated panorama uncredited and its texts intact", () => {
    const slides = resolveHeroSlides("Arena", null, ARENA_PREVIEW_PROFILE.hero);
    expect(slides[1]?.subtitle).toBe("Destinos escolhidos de acordo com o perfil da sua família ou grupo, com atenção à estrutura, à localização e ao que está incluído.");
    expect(slides[1]?.imageCredit).toBeUndefined();
    expect(slides[2]?.imageCredit).toBeUndefined();
    const third = ARENA_PREVIEW_PROFILE.hero.find((s) => s.order === 3);
    expect(third?.image).toBe("arenaMontanhas");
    expect(third?.imageCredit).toBeUndefined();
    expect(third?.kicker).toBe("EUROPA NO SEU RITMO");
    expect(third?.title).toBe("Novos lugares. Boas companhias. A sua viagem.");
  });
  it("does not add attribution to slides without it", () => {
    const slides = resolveHeroSlides("Agency", null, [{ title: "Trip", subtitle: "", order: 1, enabled: true }]);
    expect(slides[0]?.imageCredit).toBeUndefined();
  });
});