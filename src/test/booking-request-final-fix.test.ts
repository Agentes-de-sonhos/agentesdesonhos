import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildRequestedServicesView, requestedItemLabel } from "@/lib/bookingRequestCrmView";

describe("rótulos do CRM a partir do snapshot", () => {
  it("prioriza option_label do snapshot sobre service_name genérico", () => {
    expect(
      requestedItemLabel({
        service_name: "hotel",
        service_type: "hotel",
        snapshot: { option_label: "Opção A — Fontainebleau" },
      } as any),
    ).toBe("Opção A — Fontainebleau");
  });

  it("usa hotel_name, airline, provider e rental_company do service_data", () => {
    const label = (data: any, type = "hotel") =>
      requestedItemLabel({ service_name: type, service_type: type, snapshot: { service_data: data } } as any);
    expect(label({ hotel_name: "Ocean Drive Hotel" })).toBe("Ocean Drive Hotel");
    expect(label({ airline: "LATAM" }, "flight")).toBe("LATAM");
    expect(label({ provider: "VITALCARD" }, "insurance")).toBe("VITALCARD");
    expect(label({ rental_company: "Alamo" }, "car_rental")).toBe("Alamo");
    expect(label({ custom_title: "City tour VIP" }, "other")).toBe("City tour VIP");
  });

  it("cai para o rótulo humano do tipo quando o snapshot não tem nome comercial", () => {
    expect(requestedItemLabel({ service_name: "insurance", service_type: "insurance", snapshot: {} } as any))
      .not.toBe("insurance");
  });

  it("mantém service_name quando ele é específico", () => {
    expect(
      requestedItemLabel({ service_name: "Seguro Vitalcard 60k", service_type: "insurance" } as any),
    ).toBe("Seguro Vitalcard 60k");
  });

  it("não altera o snapshot ao montar a visão", () => {
    const snapshot = { option_label: "Opção A", service_data: { hotel_name: "Hotel X" } };
    const clone = JSON.parse(JSON.stringify(snapshot));
    const view = buildRequestedServicesView({
      items: [{ id: "i1", service_name: "hotel", service_type: "hotel", amount_snapshot: 100, snapshot } as any],
      quoteServices: [],
    });
    expect(view.selected[0].label).toBe("Opção A");
    expect(snapshot).toEqual(clone);
  });
});

describe("ação do CRM condicionada a pedido ativo", () => {
  const card = readFileSync("src/components/crm/OpportunityCard.tsx", "utf8");
  const hook = readFileSync("src/hooks/useHasBookingRequest.ts", "utf8");

  it("só renderiza a ação quando há pedido de reserva ativo", () => {
    expect(card).toContain("useHasBookingRequest(opportunity.id)");
    expect(card).toMatch(/hasBookingRequest && \(\s*<DropdownMenuItem/);
  });

  it("a verificação é leve: apenas id, limite 1 e status ativos", () => {
    expect(hook).toContain('.select("id")');
    expect(hook).toContain(".limit(1)");
    expect(hook).toContain("(superseded,cancelled,expired)");
  });
});

describe("texto de sucesso do link público", () => {
  const panel = readFileSync("src/components/quote/QuoteBookingRequestPanel.tsx", "utf8");

  it("usa canais cadastrados para orçamento nominal e canal informado no fallback", () => {
    expect(panel).toContain('hasLinkedClient ? "pelos canais cadastrados" : "pelo canal informado"');
  });
});