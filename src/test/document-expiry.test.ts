import { describe, it, expect, vi, afterEach } from "vitest";
import {
  daysUntil,
  documentStatus,
  formatBrDate,
  reminderDates,
  expiryWhatsappMessage,
  whatsappLink,
} from "@/lib/documentExpiry";

function freeze(dateIso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${dateIso}T12:00:00`));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("validade de documentos", () => {
  it("calcula os dias restantes no fuso local", () => {
    freeze("2026-01-01");
    expect(daysUntil("2026-01-31")).toBe(30);
    expect(daysUntil("2025-12-25")).toBe(-7);
    expect(daysUntil(null)).toBeNull();
  });

  it("classifica as faixas de criticidade", () => {
    freeze("2026-01-01");
    expect(documentStatus("2025-12-01")?.key).toBe("vencido");
    expect(documentStatus("2026-01-20")?.key).toBe("critico");
    expect(documentStatus("2026-03-15")?.key).toBe("atencao");
    expect(documentStatus("2026-06-01")?.key).toBe("oportunidade");
    expect(documentStatus("2027-01-01")?.key).toBe("em_dia");
  });

  it("projeta avisos 6 e 3 meses antes do vencimento", () => {
    const dates = reminderDates("2026-12-31");
    expect(dates.map((d) => d.label)).toEqual(["6 meses", "3 meses"]);
    expect(dates[0].date).toBe("2026-07-04");
    expect(dates[1].date).toBe("2026-10-02");
  });

  it("formata a data no padrão brasileiro", () => {
    expect(formatBrDate("2026-12-31")).toBe("31/12/2026");
    expect(formatBrDate(null)).toBe("—");
  });

  it("monta a mensagem e o link de WhatsApp", () => {
    const msg = expiryWhatsappMessage({
      clientName: "Juliana",
      travelerName: "Pedro",
      documentLabel: "Visto Americano",
      dateValue: "2026-12-31",
    });
    expect(msg).toContain("Visto Americano de Pedro");
    expect(msg).toContain("31/12/2026");
    expect(whatsappLink("(11) 95741-4840", "oi")).toBe("https://wa.me/5511957414840?text=oi");
    expect(whatsappLink("123", "oi")).toBeNull();
  });
});
