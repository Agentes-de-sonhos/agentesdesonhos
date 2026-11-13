import { describe, expect, it } from "vitest";
import { ARENA_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveHeroSlides } from "@/lib/agencySiteConfig";

describe("optional per-slide attribution", () => {
  it("preserves source and commercial license through image resolution", () => {
    const slides = resolveHeroSlides("Arena", null, ARENA_PREVIEW_PROFILE.hero);
    expect(slides[1]?.subtitle).toBe("Destinos escolhidos de acordo com o perfil da sua família ou grupo, com atenção à estrutura, à localização e ao que está incluído.");
    expect(slides[1]?.imageCredit).toBeUndefined();
    expect(slides[2]?.imageCredit?.license).toBe("CC BY-SA 4.0");
  });
  it("does not add attribution to slides without it", () => {
    const slides = resolveHeroSlides("Agency", null, [{ title: "Trip", subtitle: "", order: 1, enabled: true }]);
    expect(slides[0]?.imageCredit).toBeUndefined();
  });
});