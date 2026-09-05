import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { MAX_HOTEL_GALLERY_IMAGES } from "@/lib/quoteHotelGallery";

const read = (p: string) => readFileSync(p, "utf8");

describe("economia de chamadas Google Places Photo", () => {
  it("hospedagem: sugestões apenas sob demanda, no máximo 5", () => {
    const picker = read("src/components/shared/GoogleHotelPhotos.tsx");
    expect(picker).toContain("!requested");
    expect(picker).toContain("Buscar fotos do Google");
    const gallery = read("src/components/quote/HotelPhotoGallery.tsx");
    expect(gallery).not.toMatch(/GoogleHotelPhotos[\s\S]{0,400}autoShow/);
    expect(MAX_HOTEL_GALLERY_IMAGES).toBe(5);
  });

  it("hotel-photos resolve só a foto pedida e no máximo 5 miniaturas", () => {
    const fn = read("supabase/functions/hotel-photos/index.ts");
    expect(fn).toContain("photo_index");
    expect(fn).toContain("all.slice(0, 5)");
    // Nenhum caminho resolve full + thumb para todas as fotos.
    expect(fn).not.toContain("1600),\n            resolveGooglePlacePhotoUrl");
  });

  it("gplace:// resolve por índice com cache em memória", () => {
    const lib = read("src/lib/serviceImages.ts");
    expect(lib).toContain("photo_index: index");
    expect(lib).toContain("`${placeId}|${index}|${size}`");
  });

  it("fotos de atividade buscam no máximo 5 candidatas com 1 chamada cada", () => {
    expect(read("src/components/itinerary/ActivityMediaActions.tsx")).toContain("limit: 5");
    const fn = read("supabase/functions/activity-photo/index.ts");
    expect(fn).toContain("1), 5)");
    expect(fn).toContain("thumb_url: full");
  });
});
