import { describe, it, expect } from "vitest";
import { ARENA_PREVIEW_PROFILE, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";

const APPROVED = ["Alpes Franceses", "Suíça", "Itália", "Resorts no Brasil", "Caribe all inclusive", "Disney Orlando"];

describe("Arena destinations gallery", () => {
  const list = ARENA_PREVIEW_PROFILE.destinations ?? [];
  it("has exactly the six approved destinations in fixed order", () => {
    expect(list.map(d => d.title)).toEqual(APPROVED);
    expect(ARENA_PREVIEW_PROFILE.destinationsFixedOrder).toBe(true);
  });
  it("uses six distinct images, none from O Mundo em Cores", () => {
    const imgs = list.map(d => d.image);
    expect(new Set(imgs).size).toBe(6);
    const mundo = new Set((MUNDO_EM_CORES_PREVIEW_PROFILE.destinations ?? []).map(d => d.image));
    imgs.forEach(i => expect(mundo.has(i)).toBe(false));
  });
  it("Disney Orlando uses the standard full-card photo and links to /disney", () => {
    const disney = list[5];
    expect(disney.image).toBe("arenaRafaelMickey");
    expect(disney.imageFit).toBeUndefined();
    expect(disney.imagePosition).toBe("center 40%");
    expect(disney.href).toBe("/disney");
  });
  it("Alps and Resorts link to existing pages", () => {
    expect(list[0].href).toBe("/club-med-neve?pais=franca");
    expect(list[3].href).toBe("/resorts-brasil");
  });
  it("omits the requested gallery credit line", () => {
    expect(ARENA_PREVIEW_PROFILE.destinationCredits).toBeUndefined();
  });
  it("does not change other sites", () => {
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.destinationsFixedOrder).toBeUndefined();
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.destinationCredits).toBeUndefined();
  });
});
