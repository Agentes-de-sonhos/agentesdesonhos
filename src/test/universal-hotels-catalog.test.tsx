import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { UNIVERSAL_HOTELS } from "@/components/landing/universal/content";
import { getUniversalHotelPage, universalHotelSlugByName } from "@/components/landing/universal/universalHotelsCatalog";

describe("páginas dos hotéis da Universal", () => {
  it("todos os 11 hotéis da galeria têm página própria", () => {
    expect(UNIVERSAL_HOTELS).toHaveLength(11);
    for (const h of UNIVERSAL_HOTELS) {
      const slug = universalHotelSlugByName(h.name);
      expect(slug, h.name).toBeTruthy();
      const page = getUniversalHotelPage(slug!);
      expect(page?.name).toBe(h.name);
      expect(page!.photos.length).toBeGreaterThanOrEqual(5);
      for (const p of page!.photos) expect(existsSync(`public${p.url}`), p.url).toBe(true);
      expect(page!.google?.rating).toBeGreaterThan(0);
      expect(page!.google!.reviews!.length).toBeGreaterThan(0);
      expect(page!.location?.lat).toBeCloseTo(28.4, 0);
      expect(page!.description).toHaveLength(3);
      expect(page!.amenities.length).toBeGreaterThanOrEqual(5);
    }
  });
  it("slug desconhecido não gera página", () => {
    expect(getUniversalHotelPage("inexistente")).toBeNull();
  });
});
