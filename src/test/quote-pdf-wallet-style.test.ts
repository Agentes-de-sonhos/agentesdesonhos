import { describe, it, expect } from "vitest";
import { carTypeLabelPDF, docDisplayNamePDF } from "@/components/quote/QuotePDF";

describe("PDF do orçamento no padrão da carteira", () => {
  it("Motorhome com M maiúsculo e tipo vazio não gera texto", () => {
    expect(carTypeLabelPDF("motorhome")).toBe("Motorhome");
    expect(carTypeLabelPDF("")).toBe("");
  });
  it("nome do anexo sem extensão", () => {
    expect(docDisplayNamePDF("Motorhome 1.jpeg")).toBe("Motorhome 1");
    expect(docDisplayNamePDF("roteiro.pdf")).toBe("roteiro");
  });
});
