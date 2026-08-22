import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const panel = readFileSync("src/components/quote/booking/BookingCartDialog.tsx", "utf8");
const FOOTER = 'className="shrink-0 space-y-2 border-t';

describe("Polimento visual do painel Minha solicitação de reserva", () => {
  it("remove completamente o título Revisão e envio", () => {
    expect(panel).not.toContain("Revisão e envio");
    expect(panel).not.toContain("ClipboardCheck");
  });

  it("destaca o contorno do textarea de observações com azul suave", () => {
    const textareaStart = panel.indexOf('id="br-notes"');
    expect(textareaStart).toBeGreaterThan(0);
    const textareaBlock = panel.slice(textareaStart, textareaStart + 500);
    expect(textareaBlock).toContain("border-primary/40");
    expect(textareaBlock).toContain("focus-visible:border-primary");
  });

  it("estiliza Continuar escolhendo com fundo cinza claro, borda e texto escuro", () => {
    const start = panel.indexOf("data-booking-continue-body");
    expect(start).toBeGreaterThan(0);
    const block = panel.slice(start - 120, start + 260);
    expect(block).toContain("bg-muted");
    expect(block).toContain("border-border");
    expect(block).toContain("text-foreground");
    expect(block).toContain("hover:bg-muted/80");
  });

  it("mantém o botão Continuar escolhendo no corpo e fora do rodapé fixo", () => {
    const footerStart = panel.indexOf(FOOTER);
    const body = panel.slice(0, footerStart);
    expect(body).toContain("data-booking-continue-body");
    const footer = panel.slice(footerStart);
    expect(footer).not.toContain("Continuar escolhendo");
  });

  it("mantém no rodapé fixo apenas total, aceite e botão de envio", () => {
    const footer = panel.slice(panel.indexOf(FOOTER));
    expect(footer).toContain("cart.totalLabel");
    expect(footer).toContain("data-booking-disclaimer-accept");
    expect(footer).toContain("Enviar solicitação de reserva");
  });
});
