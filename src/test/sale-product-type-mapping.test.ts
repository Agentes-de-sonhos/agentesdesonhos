import { describe, it, expect } from "vitest";
import { PRODUCT_TYPES, type ProductType } from "@/types/financial";
import { canonicalSaleProductType } from "@/lib/saleProductTypes";

/**
 * Espelho em TypeScript da função canonical_sale_product_type do banco: todo
 * alias real (IA, inglês, português) precisa virar um tipo aceito pelo CHECK de
 * sale_products.product_type — inclusive 'pacote', usado no orçamento fechado.
 */
const ALLOWED = Object.keys(PRODUCT_TYPES) as ProductType[];

describe("Tipo canônico de produto financeiro", () => {
  it("mapeia todos os aliases reais para tipos aceitos", () => {
    const cases: Record<string, ProductType> = {
      flight: "aereo",
      aereo: "aereo",
      "aéreo": "aereo",
      air: "aereo",
      airfare: "aereo",
      passagem: "aereo",
      hotel: "hotel",
      hospedagem: "hotel",
      lodging: "hotel",
      accommodation: "hotel",
      insurance: "seguro",
      seguro: "seguro",
      cruise: "cruzeiro",
      cruzeiro: "cruzeiro",
      transfer: "transfer",
      transport: "transfer",
      transporte: "transfer",
      attraction: "atracao",
      atracao: "atracao",
      "atração": "atracao",
      ingresso: "atracao",
      ingressos: "atracao",
      ticket: "atracao",
      tour: "atracao",
      passeio: "atracao",
      car_rental: "locacao",
      rental_car: "locacao",
      car: "locacao",
      locacao: "locacao",
      "locação": "locacao",
      package: "pacote",
      pacote: "pacote",
    };

    for (const [input, expected] of Object.entries(cases)) {
      expect(canonicalSaleProductType(input), input).toBe(expected);
    }
  });

  it("qualquer entrada desconhecida ou vazia cai em 'outro'", () => {
    for (const input of ["", "   ", "xyz", "treinamento", null, undefined]) {
      expect(canonicalSaleProductType(input as any)).toBe("outro");
    }
  });

  it("nunca produz tipo fora do domínio aceito pelo banco", () => {
    const inputs = ["flight", "ingresso", "car_rental", "pacote", "abacaxi", "SEGURO", " Hotel "];
    for (const input of inputs) {
      expect(ALLOWED).toContain(canonicalSaleProductType(input));
    }
  });

  it("o pacote tem tipo próprio e rótulo visível na interface", () => {
    expect(canonicalSaleProductType("pacote")).toBe("pacote");
    expect(PRODUCT_TYPES.pacote).toBe("Pacote");
  });
});
