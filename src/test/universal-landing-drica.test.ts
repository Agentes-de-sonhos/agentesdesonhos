import { describe, expect, it } from "vitest";
import { isUniversalLandingEnabled, isJuUniversalProfile } from "@/lib/universalLandingAccess";

describe("landing /universal na Drica Viagens", () => {
  it("está habilitada no domínio oficial da Drica", () => {
    expect(isUniversalLandingEnabled("dricaviagens.com.br")).toBe(true);
    expect(isUniversalLandingEnabled("www.dricaviagens.com.br")).toBe(true);
  });

  it("está habilitada na apresentação da Drica", () => {
    expect(isUniversalLandingEnabled("drica-presentation.preview.local")).toBe(true);
  });

  it("não exibe conteúdo pessoal da Ju no site da Drica", () => {
    expect(isJuUniversalProfile("dricaviagens.com.br")).toBe(false);
  });
});
