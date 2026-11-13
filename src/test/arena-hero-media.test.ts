import { describe, expect, it } from "vitest";
import { ARENA_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveHeroSlides } from "@/lib/agencySiteConfig";

describe("optional per-slide attribution", () => {
  it("preserves source and commercial license through image resolution", () => {
    const slides = resolveHeroSlides("Arena", null, ARENA_PREVIEW_PROFILE.hero);
    expect(slides[1]?.imageCredit?.source).toBe("https://commons.wikimedia.org/w/index.php?curid=47399645");
    expect(slides[1]?.imageCredit?.license).toBe("CC BY 3.0");
    expect(slides[2]?.imageCredit?.license).toBe("CC BY-SA 4.0");
  });
  it("does not add attribution to slides without it", () => {
    const slides = resolveHeroSlides("Agency", null, [{ title: "Trip", subtitle: "", order: 1, enabled: true }]);
    expect(slides[0]?.imageCredit).toBeUndefined();
  });
});