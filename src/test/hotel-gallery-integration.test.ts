import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { MAX_HOTEL_GALLERY_IMAGES } from "@/lib/quoteHotelGallery";

const read = (p: string) => readFileSync(p, "utf8");

describe("integração da galeria de hospedagem", () => {
  it("mantém o limite de 5 fotos em hospedagem e nos demais serviços", () => {
    const src = read("src/components/quote/ServiceForms.tsx");
    expect(src).toContain("const MAX_IMAGES_PER_SERVICE = 5;");
    expect(MAX_HOTEL_GALLERY_IMAGES).toBe(5);
    // A galeria de hospedagem é usada apenas no caminho de hotel (hotelMode).
    expect(src).toMatch(/if \(hotelMode\) \{[\s\S]{0,200}HotelPhotoGallery/);
  });

  it("o público resolve as imagens salvas (image_urls + gplace://)", () => {
    const carousel = read("src/components/quote/ServiceImageCarousel.tsx");
    expect(carousel).toContain("useServiceImages");
    const publico = read("src/pages/OrcamentoPublico.tsx");
    expect(publico).toMatch(/image_urls/);
  });

  it("o PDF continua resolvendo gplace://", () => {
    const pdf = read("src/components/quote/QuotePDF.tsx");
    expect(pdf).toContain("resolveServiceImages");
    expect(pdf).toContain("resolveServiceImages");
  });

  it("a Edge Function de importação valida JWT e bloqueia SSRF", () => {
    const fn = read("supabase/functions/import-quote-image/index.ts");
    expect(fn).toContain("supabase.auth.getUser()");
    expect(fn).not.toContain("SERVICE_ROLE");
    expect(fn).toContain("${user.id}/quotes");
    // Identidade determinística: mesma URL ⇒ mesmo arquivo `url-<sha256>`.
    expect(fn).toContain("url-${hash}");
    expect(fn).toContain("normalizeRemoteImageUrl");
    const helper = read("supabase/functions/_shared/remote-image-fetch.ts");
    expect(helper).toContain("isPrivateIPv4");
    expect(helper).toContain("isPrivateIPv6");
    expect(helper).toContain('redirect: "manual"');
    expect(helper).not.toContain("image/svg");
    // Content-Type falsificado não passa: o tipo real vem dos magic bytes.
    expect(helper).toContain("sniffImageType(buf)");
  });
});
