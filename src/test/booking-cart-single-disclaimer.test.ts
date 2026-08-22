import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BOOKING_REQUEST_DISCLAIMER } from "@/lib/quoteBookingSelection";

const panel = readFileSync("src/components/quote/booking/BookingCartDialog.tsx", "utf8");

describe("aceite único no rodapé fixo do modal de solicitação", () => {
  it("o disclaimer aparece exatamente uma vez no componente", () => {
    const occurrences = panel.split("{BOOKING_REQUEST_DISCLAIMER}").length - 1;
    expect(occurrences).toBe(1);
  });

  it("o aceite está no rodapé fixo, dentro do bloco não-vazio", () => {
    const footerStart = panel.indexOf('className="shrink-0 space-y-2 border-t');
    expect(footerStart).toBeGreaterThan(0);
    const footer = panel.slice(footerStart);
    expect(footer).toContain("data-booking-disclaimer-accept");
    expect(footer).toContain("{BOOKING_REQUEST_DISCLAIMER}");
    expect(footer).toContain("{!isEmpty && (");
  });

  it("não existe mais card de aceite no corpo rolável", () => {
    const footerStart = panel.indexOf('className="shrink-0 space-y-2 border-t');
    const body = panel.slice(0, footerStart);
    expect(body).not.toContain("BOOKING_REQUEST_DISCLAIMER}");
    expect(body).not.toContain("Aceito o aviso sobre a solicitação de reserva");
    // Observações continua no corpo
    expect(body).toContain('htmlFor="br-notes"');
  });

  it("checkbox acessível é a única fonte de estado de accepted", () => {
    expect(panel).toContain("const [accepted, setAccepted] = useState(false)");
    expect(panel).toContain("onCheckedChange={(v) => setAccepted(v === true)}");
    expect(panel).toContain('aria-label="Aceito o aviso sobre a solicitação de reserva"');
    expect(panel).toContain("disclaimerAccepted: accepted");
    // não marca automaticamente
    expect(panel).not.toContain("setAccepted(true)");
  });

  it("mantém texto jurídico intacto e a validação obrigatória", () => {
    expect(BOOKING_REQUEST_DISCLAIMER.startsWith("Esta é uma solicitação de reserva.")).toBe(true);
    const rules = readFileSync("src/lib/quoteBookingSelection.ts", "utf8");
    expect(rules).toContain("É necessário aceitar o aviso de que o pedido não confirma a reserva.");
  });

  it("estado de sucesso não mostra aceite", () => {
    const footerStart = panel.indexOf('className="shrink-0 space-y-2 border-t');
    const footer = panel.slice(footerStart);
    const successBranch = footer.slice(footer.indexOf("{success ? ("), footer.indexOf(") : ("));
    expect(successBranch).not.toContain("BOOKING_REQUEST_DISCLAIMER");
  });
});
