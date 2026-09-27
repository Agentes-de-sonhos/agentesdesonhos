import { describe, expect, it } from "vitest";
import {
  EMPTY_OFFER_REQUEST,
  filterPublicOffers,
  formatOfferPrice,
  isProvenPromotion,
  similarQuotePrefill,
  validateOfferRequest,
  type PublicOffer,
} from "@/lib/offers";

const o = (p: Partial<PublicOffer>): PublicOffer => ({ slug: "x", status: "published", ...p });

describe("ofertas", () => {
  it("nunca mostra R$ 0,00", () => {
    expect(formatOfferPrice(0)).not.toMatch(/0,00/);
    expect(formatOfferPrice(null)).not.toMatch(/0,00/);
  });
  it("promoção só com desconto comprovado", () => {
    expect(isProvenPromotion({ price_mode: "fixed", price_from: 100, compare_at_price: 150 })).toBe(true);
    expect(isProvenPromotion({ price_mode: "fixed", price_from: 100, compare_at_price: null })).toBe(false);
  });
  it("filtra por categoria, destino e mês", () => {
    const list = [
      o({ slug: "a", category: "Pacotes", destination: "Orlando", travel_start: "2027-03-10" }),
      o({ slug: "b", category: "Cruzeiros", destination: "Caribe", travel_start: "2027-04-10" }),
    ];
    expect(filterPublicOffers(list, { category: "Pacotes" }).map((x) => x.slug)).toEqual(["a"]);
    expect(filterPublicOffers(list, { month: "2027-04" }).map((x) => x.slug)).toEqual(["b"]);
  });
  it("formulário exige cidade de saída, WhatsApp e consentimento", () => {
    const e = validateOfferRequest({ ...EMPTY_OFFER_REQUEST, lead_name: "Ana Souza" });
    expect(e.departure_city).toBeTruthy();
    expect(e.lead_phone).toBeTruthy();
    expect(e.consent).toBeTruthy();
    expect(e.lead_email).toBeFalsy();
  });
  it("cotação semelhante leva o destino", () => {
    expect(similarQuotePrefill(o({ destination: "Orlando" })).destinos).toBe("Orlando");
  });
});
