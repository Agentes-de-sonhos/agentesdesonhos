import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const panel = readFileSync("src/components/quote/booking/BookingCartDialog.tsx", "utf8");
const FOOTER = 'className="shrink-0 space-y-2 border-t';

describe("Continuar escolhendo fora do rodapé fixo", () => {
  it("o rodapé fixo não contém o botão", () => {
    const footer = panel.slice(panel.indexOf(FOOTER));
    expect(footer).not.toContain("Continuar escolhendo");
  });

  it("existe exatamente um botão na revisão com itens, no corpo rolável", () => {
    const body = panel.slice(0, panel.indexOf(FOOTER));
    const inBody = body.split("Continuar escolhendo").length - 1;
    // 1 do estado vazio (ação principal) + 1 da revisão
    expect(inBody).toBe(2);
    expect(body).toContain("data-booking-continue-body");
    expect(body.split("data-booking-continue-body").length - 1).toBe(1);
  });

  it("fica imediatamente depois do textarea de observações", () => {
    const textarea = panel.indexOf('id="br-notes"');
    const button = panel.indexOf("data-booking-continue-body");
    expect(textarea).toBeGreaterThan(0);
    expect(button).toBeGreaterThan(textarea);
    // nada entre eles além do fechamento do campo
    const between = panel.slice(textarea, button);
    expect(between).not.toContain("<Input");
    expect(between).not.toContain("<Label");
  });

  it("apenas fecha o modal, sem limpar seleção", () => {
    const start = panel.indexOf("data-booking-continue-body");
    const block = panel.slice(start, start + 400);
    expect(block).toContain("onClick={() => cart.setCartOpen(false)}");
    expect(block).not.toContain("clear");
    expect(block).not.toContain("setNotes(");
  });

  it("é secundário, largura total no mobile e não sticky", () => {
    const start = panel.indexOf("data-booking-continue-body");
    const block = panel.slice(start - 200, start + 400);
    expect(block).toContain('variant="outline"');
    expect(block).toContain("w-full sm:w-auto");
    expect(block).toContain("min-h-[44px]");
    expect(block).not.toContain("sticky");
    expect(block).not.toContain("fixed");
  });

  it("rodapé fixo mantém total, aceite, validação e envio", () => {
    const footer = panel.slice(panel.indexOf(FOOTER));
    expect(footer).toContain("cart.totalLabel");
    expect(footer).toContain("data-booking-disclaimer-accept");
    expect(footer).toContain("cart.validationError");
    expect(footer).toContain("Enviar solicitação de reserva");
  });

  it("estado vazio preserva a ação principal e sucesso mantém só Fechar", () => {
    const body = panel.slice(0, panel.indexOf(FOOTER));
    expect(body).toContain("Continuar escolhendo");
    const footer = panel.slice(panel.indexOf(FOOTER));
    const successBranch = footer.slice(footer.indexOf("{success ? ("), footer.indexOf(") : ("));
    expect(successBranch).toContain("Fechar");
    expect(successBranch).not.toContain("Continuar escolhendo");
  });
});
