import { describe, expect, it } from "vitest";
import google from "@/components/landing/disney/disneyHotelsGoogleData.json";
import { DISNEY_PARK_PHOTOS, DISNEY_SPRINGS_SPOTS } from "@/components/landing/disney/photos";
import { DISNEY_HERO } from "@/components/landing/disney/content";

describe("Disney: somente fotos oficiais", () => {
  it("toda foto de hotel foi publicada por uma conta oficial Disney no Google", () => {
    for (const v of Object.values(google as Record<string, { photos: { credit: string }[] } | null>)) {
      for (const p of v?.photos ?? []) expect(p.credit).toMatch(/Disney/);
    }
  });
  it("parques e Disney Springs não usam acervo de terceiros", () => {
    for (const p of [...Object.values(DISNEY_PARK_PHOTOS), ...DISNEY_SPRINGS_SPOTS.map((s) => s.photo)]) {
      expect(p.credit).toMatch(/Disney|foto oficial no Google/);
      expect(p.credit).not.toMatch(/Wikimedia|CC BY/);
    }
  });
  it("os 4 banners dos parques têm foto oficial", () => {
    expect(DISNEY_HERO.every((h) => !!h.image)).toBe(true);
  });
});
