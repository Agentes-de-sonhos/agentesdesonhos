import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BOOKING_REQUEST_DISCLAIMER, quoteHasLinkedClient } from "@/lib/quoteBookingSelection";

const panel = readFileSync("src/components/quote/booking/BookingCartDialog.tsx", "utf8");
const quotesHook = readFileSync("src/hooks/useQuotes.ts", "utf8");

describe("modal final de solicitação de reserva", () => {
  it("orçamento nominal esconde os campos de contato", () => {
    expect(quoteHasLinkedClient({ has_linked_client: true })).toBe(true);
    expect(panel).toContain("{!hasLinkedClient && (");
    // os campos ficam dentro do bloco condicional de fallback
    const block = panel.slice(panel.indexOf("{!hasLinkedClient && ("));
    expect(block).toContain('htmlFor="br-name"');
    expect(block).toContain('htmlFor="br-whats"');
    expect(block).toContain('htmlFor="br-email"');
    expect(block).toContain("Informe pelo menos WhatsApp ou e-mail.");
  });

  it("orçamento genérico mantém o formulário de contato", () => {
    expect(quoteHasLinkedClient({})).toBe(false);
    expect(panel).toContain("Revise os serviços e informe como a agência pode falar com você.");
  });

  it("subtítulo nominal não pede canal de contato", () => {
    expect(panel).toContain("Revise os serviços e confirme sua solicitação.");
  });

  it("Observações continua fora do bloco condicional", () => {
    expect(panel).toContain('htmlFor="br-notes"');
  });

  it("o aviso obrigatório aparece uma única vez no checkbox", () => {
    const start = panel.indexOf("<Checkbox");
    const label = panel.slice(start, panel.indexOf("</label>", start));
    const occurrences = label.split("BOOKING_REQUEST_DISCLAIMER").length - 1;
    expect(occurrences).toBe(1);
    expect(panel).not.toContain("disclaimerText");
    expect(BOOKING_REQUEST_DISCLAIMER.startsWith("Esta é uma solicitação de reserva.")).toBe(true);
  });
});

describe("duplicar orçamento", () => {
  it("preserva client_id do orçamento original", () => {
    expect(quotesHook).toContain("client_id: (source as any).client_id ?? null");
  });
});
