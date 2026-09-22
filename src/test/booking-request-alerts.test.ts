import { describe, it, expect } from "vitest";
import {
  bookingRequestDeepLink,
  toBookingRequestAlert,
} from "@/hooks/useBookingRequestAlerts";

describe("avisos de solicitação de serviços do orçamento", () => {
  it("normaliza a linha do realtime sem PII sensível", () => {
    const alert = toBookingRequestAlert({
      id: "req-1",
      client_name: "Maria",
      protocol: "SR-0001",
      destination: "Orlando",
      opportunity_id: "opp-1",
      created_at: "2026-01-02T10:00:00Z",
      client_email: "maria@example.com",
      client_whatsapp: "+5511999999999",
      client_notes: "observações",
      total_estimated: 1234,
    });
    expect(alert).toEqual({
      id: "req-1",
      client_name: "Maria",
      protocol: "SR-0001",
      destination: "Orlando",
      opportunity_id: "opp-1",
      created_at: "2026-01-02T10:00:00Z",
    });
    expect(JSON.stringify(alert)).not.toContain("maria@example.com");
    expect(JSON.stringify(alert)).not.toContain("5511999999999");
  });

  it("descarta payload sem id", () => {
    expect(toBookingRequestAlert(null)).toBeNull();
    expect(toBookingRequestAlert({ client_name: "x" })).toBeNull();
  });

  it("deep link abre a ficha correta, com fallbacks previsíveis", () => {
    expect(bookingRequestDeepLink("file-9", "opp-1")).toBe("/reservas/file-9");
    expect(bookingRequestDeepLink(null, "opp-1")).toBe("/crm?opportunity=opp-1");
    expect(bookingRequestDeepLink(null, null)).toBe("/reservas");
  });
});
