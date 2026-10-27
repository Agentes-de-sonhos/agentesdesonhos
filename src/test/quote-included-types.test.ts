import { describe, it, expect } from "vitest";
import { computeAutoWhatsIncluded } from "@/lib/whatsIncluded";
import { defaultQuoteTitle } from "@/lib/quoteInitialSetup";

describe("O que está incluso: só tipos de serviço", () => {
  it("lista tipos sem nome de hotel ou cidade, sem repetir", () => {
    const quote = { services: [
      { service_type: "hotel", service_data: { hotel_name: "Hotel Praia" } },
      { service_type: "flight", service_data: { origin_city: "São Paulo" } },
      { service_type: "flight", service_data: {} },
      { service_type: "car_rental" }, { service_type: "attraction" }, { service_type: "insurance" },
    ] };
    expect(computeAutoWhatsIncluded(quote)).toEqual([
      "Passagens aéreas", "Hospedagem", "Locação de carro", "Ingressos", "Seguro viagem",
    ]);
  });
});

describe("título padrão do orçamento", () => {
  it("usa destino e ano da viagem", () => {
    expect(defaultQuoteTitle({ destination: "Orlando", start_date: "2027-07-01" })).toBe("Viagem para Orlando 2027");
    expect(defaultQuoteTitle({ destination: "Orlando" })).toBe("Viagem para Orlando");
    expect(defaultQuoteTitle({ destination: "" })).toBeNull();
  });
});
