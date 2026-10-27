import { describe, it, expect } from "vitest";
import { buildToolSharePreview } from "@/lib/toolSharePreview";

const base = { destination: "Nova York", clientName: "Adriana Augusta", agencyName: "Paraíso Viagens", startDate: "2026-11-10", endDate: "2026-11-17" };

describe("prévia de link das ferramentas", () => {
  it("orçamento: destino, noites, datas e cliente no título", () => {
    expect(buildToolSharePreview({ kind: "quote", ...base }).title)
      .toBe("Nova York · 7 noites (10/11 a 17/11) | Proposta Adriana · Paraíso Viagens");
  });
  it("roteiro usa dias", () => {
    expect(buildToolSharePreview({ kind: "itinerary", ...base }).title)
      .toBe("Roteiro Nova York · 8 dias (10/11 a 17/11) | Adriana · Paraíso Viagens");
  });
  it("carteira", () => {
    expect(buildToolSharePreview({ kind: "wallet", ...base }).title)
      .toBe("Carteira de Viagem · Nova York · 7 noites (10/11 a 17/11) | Adriana · Paraíso Viagens");
  });
  it("sem datas omite período", () => {
    expect(buildToolSharePreview({ kind: "quote", ...base, startDate: null, endDate: null }).title)
      .toBe("Nova York | Proposta Adriana · Paraíso Viagens");
  });
  it("imagem: foto do destino tem prioridade", () => {
    expect(buildToolSharePreview({ kind: "quote", ...base, coverImage: "https://x/ny.jpg", hostname: "paraisoviagens.com" }).image).toBe("https://x/ny.jpg");
  });
  it("imagem: sem foto usa banner da agência", () => {
    expect(buildToolSharePreview({ kind: "quote", ...base, hostname: "paraisoviagens.com" }).image).toBe("https://paraisoviagens.com/og/share-paraiso.jpg");
  });
  it("imagem: agência sem banner usa logotipo", () => {
    expect(buildToolSharePreview({ kind: "quote", ...base, hostname: "outra.com.br", agencyLogo: "https://x/logo.png" }).image).toBe("https://x/logo.png");
  });
});
