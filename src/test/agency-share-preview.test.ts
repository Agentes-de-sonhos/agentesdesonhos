import { describe, it, expect } from "vitest";
import { resolveAgencySharePreview } from "@/lib/agencySharePreview";

describe("prévia de link por agência", () => {
  it.each([
    ["www.destinoscomaju.com.br", "Destinos com a Ju", "/og/share-ju.jpg"],
    ["100limites.tur.br", "100 Limites Viagens", "/og/share-limites.jpg"],
    ["paraisoviagens.com", "Paraíso Viagens", "/og/share-paraiso.jpg"],
    ["omundoemcores.com.br", "O Mundo em Cores", "/og/share-mundo.jpg"],
  ])("%s usa o próprio logotipo", (host, name, path) => {
    const p = resolveAgencySharePreview(host)!;
    expect(p.siteName).toBe(name);
    expect(p.image).toBe(`https://${host}${path}`);
  });
  it("outros domínios não mudam", () => {
    expect(resolveAgencySharePreview("bardelliviagens.com.br")).toBeNull();
  });
});
