/**
 * Composição dinâmica de passageiros exibida junto ao "Valor do serviço"
 * no orçamento público. Prioridade: fonte do próprio serviço (quartos de
 * hotel, composição tarifária) → composição geral do orçamento.
 */
import { describe, expect, it } from "vitest";
import {
  buildPassengerLabel,
  buildServicePassengerLabel,
  formatPassengerComposition,
  resolveServicePassengerComposition,
} from "@/lib/quotePassengers";
import type { Quote, QuoteService } from "@/types/quote";

const quote = (adults: number, children: number, infants = 0) =>
  ({ adults_count: adults, children_count: children, infants_count: infants } as unknown as Quote);
const svc = (service_data: any) =>
  ({ id: "s1", service_type: "hotel", amount: 100, service_data } as unknown as QuoteService);

describe("formatPassengerComposition", () => {
  it("trata singular e plural e omite categorias zeradas", () => {
    expect(formatPassengerComposition({ adults: 1, children: 0, infants: 0 })).toBe("1 adulto");
    expect(formatPassengerComposition({ adults: 2, children: 0, infants: 0 })).toBe("2 adultos");
    expect(formatPassengerComposition({ adults: 2, children: 1, infants: 0 })).toBe("2 adultos e 1 criança");
    expect(formatPassengerComposition({ adults: 2, children: 2, infants: 0 })).toBe("2 adultos e 2 crianças");
    expect(formatPassengerComposition({ adults: 2, children: 2, infants: 1 })).toBe(
      "2 adultos, 2 crianças e 1 bebê",
    );
    expect(formatPassengerComposition({ adults: 1, children: 0, infants: 2 })).toBe("1 adulto e 2 bebês");
  });

  it("buildPassengerLabel continua lendo a composição do orçamento", () => {
    expect(buildPassengerLabel(quote(2, 1, 1))).toBe("2 adultos, 1 criança e 1 bebê");
    expect(buildPassengerLabel(quote(0, 0, 0))).toBe("Passageiros não informados");
  });
});

describe("resolveServicePassengerComposition", () => {
  it("soma quartos de hotel considerando a quantidade de apartamentos", () => {
    const c = resolveServicePassengerComposition(
      svc({ rooms: [{ quantity: 2, adults: 2, children: 1 }, { quantity: 1, adults: 1, children: 0 }] }),
    );
    expect(c).toEqual({ adults: 5, children: 2, infants: 0 });
  });

  it("usa a composição tarifária de ingressos por passageiro", () => {
    const c = resolveServicePassengerComposition(
      svc({
        fare_composition: {
          passengers: [{ base: "adult" }, { base: "adult" }, { base: "child" }],
        },
      }),
    );
    expect(c).toEqual({ adults: 2, children: 1, infants: 0 });
  });

  it("aceita contagens explícitas gravadas no service_data", () => {
    expect(resolveServicePassengerComposition(svc({ adults: 3, children: 1 }))).toEqual({
      adults: 3,
      children: 1,
      infants: 0,
    });
    expect(resolveServicePassengerComposition(svc({ adults_count: 1, infants_count: 1 }))).toEqual({
      adults: 1,
      children: 0,
      infants: 1,
    });
  });

  it("retorna null quando o serviço não tem fonte própria", () => {
    expect(resolveServicePassengerComposition(svc({ hotel_name: "X" }))).toBeNull();
    expect(resolveServicePassengerComposition(null)).toBeNull();
  });
});

describe("buildServicePassengerLabel", () => {
  it("prioriza a fonte do serviço sobre a do orçamento", () => {
    expect(buildServicePassengerLabel(svc({ rooms: [{ quantity: 1, adults: 3, children: 0 }] }), quote(2, 2))).toBe(
      "3 adultos",
    );
  });

  it("cai para a composição geral do orçamento", () => {
    expect(buildServicePassengerLabel(svc({ hotel_name: "X" }), quote(2, 2))).toBe("2 adultos e 2 crianças");
  });

  it("retorna null quando não há nenhuma informação de passageiros", () => {
    expect(buildServicePassengerLabel(svc({}), quote(0, 0))).toBeNull();
    expect(buildServicePassengerLabel(svc({}), undefined)).toBeNull();
  });
});
