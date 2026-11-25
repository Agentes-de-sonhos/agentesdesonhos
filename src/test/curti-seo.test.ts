import { describe, it, expect } from "vitest";
import { resolveAgencySharePreview } from "@/lib/agencySharePreview";
import { CURTI_VIAGENS_OFFICIAL_PROFILE } from "@/lib/adsBriefingPreview";

describe("Curti Viagens SEO", () => {
  it("home canonical is the agency's own domain", () => {
    expect(CURTI_VIAGENS_OFFICIAL_PROFILE.seo?.canonical).toBe("https://www.curtiviagens.com.br/");
    expect(CURTI_VIAGENS_OFFICIAL_PROFILE.seo?.title).not.toMatch(/Prévia/i);
  });
  it("share preview uses the Curti card on both hosts", () => {
    for (const h of ["curtiviagens.com.br", "www.curtiviagens.com.br"]) {
      const p = resolveAgencySharePreview(h);
      expect(p?.canonical).toBe("https://www.curtiviagens.com.br/");
      expect(p?.image).toBe("https://www.curtiviagens.com.br/og/share-curti.jpg");
    }
  });
});
