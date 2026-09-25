import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveDmc } from "@/lib/agencySiteConfig";

const dmcSource = readFileSync("src/components/whitelabel/AgencyDmcSection.tsx", "utf8");
const homeSource = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");

describe("seção DMC da 100 Limites", () => {
  it("usa apresentação clara e a nova foto somente nos hosts configurados", () => {
    for (const hostname of ["100limites.tur.br", "www.100limites.tur.br"]) {
      const dmc = resolveDmc(hostname);
      expect(dmc?.presentation?.surface).toBe("light");
      expect(dmc?.presentation?.imageUrl).toContain("dmc-cristiane-portugal.jpg");
      expect(dmc?.title).toBe("Sua DMC em Portugal");
      expect(dmc?.cta).toBe("Falar sobre uma parceria");
    }
    expect(resolveDmc("paraisoviagens.com")).toBeNull();
    expect(resolveDmc("destinoscomaju.com.br")).toBeNull();
  });

  it("mantém o layout e adapta contraste, foto e transição ao fundo claro", () => {
    expect(dmcSource).toContain('lightSurface ? "bg-card text-foreground"');
    expect(dmcSource).toContain("config.presentation?.imageUrl ?? destinoEuropa");
    expect(dmcSource).toContain("{!lightSurface && (");
    expect(dmcSource).toContain("text-card");
    expect(homeSource).toContain('dmc?.presentation?.surface === "light"');
  });
});