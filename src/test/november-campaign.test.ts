import { describe, expect, it } from "vitest";
import { isNovemberCampaignAllowed } from "@/lib/novemberCampaignAccess";
import { filterCampaignOffers, novemberOffers } from "@/components/campaign/novemberCampaignData";

describe("November campaign isolation", () => {
  it("allows only the technical preview for O Mundo em Cores", () => {
    expect(isNovemberCampaignAllowed("id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app", "?__agency_host=omundoemcores.com.br")).toBe(true);
    expect(isNovemberCampaignAllowed("localhost", "?__agency_host=www.omundoemcores.com.br")).toBe(true);
  });
  it("rejects production even when a preview override is supplied", () => {
    for (const host of ["omundoemcores.com.br", "www.omundoemcores.com.br", "agentedesonhosproject.lovable.app", "agentedesonhoproject.lovable.app"]) {
      expect(isNovemberCampaignAllowed(host, "?__agency_host=omundoemcores.com.br")).toBe(false);
    }
  });
  it("rejects other tenants and missing context", () => {
    expect(isNovemberCampaignAllowed("localhost", "?__agency_host=destinoscomaju.com.br")).toBe(false);
    expect(isNovemberCampaignAllowed("localhost", "?__agency_host=100limites.tur.br")).toBe(false);
    expect(isNovemberCampaignAllowed("localhost", "")).toBe(false);
  });
});
describe("Illustrative campaign data", () => {
  it("keeps Cancún discount at up to 30 percent", () => {
    expect(novemberOffers.find(offer => offer.id === "cancun")?.discountPercent).toBe(30);
  });
  it("keeps Orlando at ten installments of 599 BRL", () => {
    const offer = novemberOffers.find(item => item.id === "orlando");
    expect(offer?.installments).toBe(10);
    expect(offer?.installmentBRL).toBe(599);
  });
  it("filters local destination and period without changing the offers", () => {
    expect(filterCampaignOffers(novemberOffers, "familia", "novembro-2026").map(offer => offer.id)).toEqual(["orlando"]);
    expect(filterCampaignOffers(novemberOffers, "todos", "2027").map(offer => offer.id)).toEqual(["europa", "cruzeiros"]);
    expect(filterCampaignOffers(novemberOffers, "europa", "novembro-2026")).toHaveLength(0);
    expect(novemberOffers).toHaveLength(4);
  });
});