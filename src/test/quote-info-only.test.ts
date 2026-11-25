import { describe, it, expect } from "vitest";
import { isInfoOnlyService, countCommercialServices } from "@/lib/quoteInfoOnly";

describe("texto informativo em Outros Serviços", () => {
  it("não conta como serviço no contador da seção", () => {
    const services = [
      { service_type: "attraction", service_data: {} },
      { service_type: "transfer", service_data: {} },
      { service_type: "other", service_data: { info_only: true } },
    ];
    expect(countCommercialServices(services)).toBe(2);
  });
  it("só vale para Outros Serviços com a chave ligada", () => {
    expect(isInfoOnlyService({ service_type: "other", service_data: {} })).toBe(false);
    expect(isInfoOnlyService({ service_type: "hotel", service_data: { info_only: true } })).toBe(false);
  });
});
