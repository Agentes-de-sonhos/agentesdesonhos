import { describe, it, expect } from "vitest";
import { offerInChannel } from "@/lib/offers";
describe("canais de exibição de ofertas", () => {
  it("ofertas antigas sem canal ficam só em /ofertas", () => {
    expect(offerInChannel({}, "ofertas")).toBe(true);
    expect(offerInChannel({}, "novembro")).toBe(false);
  });
  it("oferta marcada só para novembro não aparece em /ofertas", () => {
    expect(offerInChannel({ channels: ["novembro"] }, "ofertas")).toBe(false);
    expect(offerInChannel({ channels: ["novembro"] }, "novembro")).toBe(true);
  });
});
