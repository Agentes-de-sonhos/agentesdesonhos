import { describe, expect, it } from "vitest";
import { immSampleOffer } from "@/lib/immOfferPreview";
import { IMM_OFFICIAL_PROFILE, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";

describe("IMM offers replacement and illustrative isolation", () => {
  it("removes the IMM featured experience without changing Mundo", () => {
    expect(IMM_OFFICIAL_PROFILE.featuredExperience).toBeUndefined();
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.featuredExperience?.enabled).toBe(true);
  });
  it("provides one sample on the IMM technical preview", () => {
    expect(immSampleOffer("www.immturismo.com.br", "localhost")?.slug).toBe("exemplo-ferias-no-nordeste");
  });
  it("never provides the sample on the real IMM domain", () => {
    expect(immSampleOffer("immturismo.com.br", "www.immturismo.com.br")).toBeNull();
  });
  it("never provides the sample for another agency", () => {
    expect(immSampleOffer("shoppingviagens.com.br", "localhost")).toBeNull();
  });
});