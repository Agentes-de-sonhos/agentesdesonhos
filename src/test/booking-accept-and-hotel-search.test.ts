import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { BOOKING_ACCEPT_REQUIRED_MESSAGE } from "@/lib/quoteBookingSelection";

const dialog = readFileSync("src/components/quote/booking/BookingCartDialog.tsx", "utf8");
const hotelFn = readFileSync("supabase/functions/hotel-autocomplete/index.ts", "utf8");

describe("aceite + envio da solicitação de reserva", () => {
  it("aceite e botão formam um bloco único alinhado à esquerda", () => {
    expect(dialog).toContain("flex flex-col items-start gap-3");
    expect(dialog).not.toContain('className="flex sm:justify-end"');
  });

  it("botão ocupa largura total no celular e fica desabilitado sem aceite", () => {
    expect(dialog).toContain('className="min-h-[48px] w-full gap-2 sm:w-auto"');
    expect(dialog).toContain("disabled={cart.submitting || !accepted}");
  });

  it("tentativa sem aceite destaca o checkbox e orienta", () => {
    expect(dialog).toContain("setAcceptHint(true)");
    expect(dialog).toContain("ring-1 ring-destructive");
    expect(dialog).toContain("BOOKING_ACCEPT_REQUIRED_MESSAGE");
    expect(BOOKING_ACCEPT_REQUIRED_MESSAGE).toContain("aceitar o aviso");
  });

  it("idempotência do envio permanece no contexto do carrinho", () => {
    expect(dialog).toContain("await cart.submit({ name, email, whatsapp, notes })");
  });
});

describe("autocomplete de hotel", () => {
  it("retorna somente meios de hospedagem", () => {
    expect(hotelFn).toContain('types.includes("lodging")');
    expect(hotelFn).toContain("const lodging = raw.filter(isLodging)");
  });

  it("exclui aeroportos, restaurantes e cafeterias no fallback", () => {
    for (const blocked of ["airport", "restaurant", "cafe"]) {
      expect(hotelFn).toContain(`"${blocked}"`);
    }
    expect(hotelFn).toContain("BLOCKED_TYPES.includes(t)");
  });

  it("mantém a cidade apenas como bias de localização", () => {
    expect(hotelFn).toContain("locationbias");
    expect(hotelFn).not.toContain("input: `${input} ${city}`");
  });
});
