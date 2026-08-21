/**
 * Regressão: a barra mobile "Minha Seleção" do orçamento público não pode
 * sobrepor (nem ser sobreposta por) o botão flutuante global do WhatsApp.
 */
import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import {
  BOOKING_FLOATING_BOTTOM,
  BOOKING_SELECTION_BAR_ATTR,
  BOOKING_SELECTION_BAR_HEIGHT_VAR,
  isBookingSelectionBarActive,
  setBookingSelectionBarActive,
} from "@/lib/bookingSelectionBar";
import { BookingCartLauncher } from "@/components/quote/booking/BookingCartLauncher";
import { BookingCartProvider } from "@/components/quote/booking/BookingCartContext";

afterEach(() => {
  cleanup();
  setBookingSelectionBarActive(false);
});

describe("bookingSelectionBar", () => {
  it("marca e limpa o body, publicando a altura da barra", () => {
    expect(isBookingSelectionBarActive()).toBe(false);
    setBookingSelectionBarActive(true, 84);
    expect(document.body.getAttribute(BOOKING_SELECTION_BAR_ATTR)).toBe("true");
    expect(
      document.documentElement.style.getPropertyValue(BOOKING_SELECTION_BAR_HEIGHT_VAR),
    ).toBe("84px");
    setBookingSelectionBarActive(false);
    expect(isBookingSelectionBarActive()).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue(BOOKING_SELECTION_BAR_HEIGHT_VAR),
    ).toBe("");
  });

  it("o offset do flutuante soma altura da barra, espaçamento e safe-area", () => {
    expect(BOOKING_FLOATING_BOTTOM).toContain(BOOKING_SELECTION_BAR_HEIGHT_VAR);
    expect(BOOKING_FLOATING_BOTTOM).toContain("env(safe-area-inset-bottom");
    expect(BOOKING_FLOATING_BOTTOM).toMatch(/0\.75rem/);
  });
});

describe("reserva de espaço inferior", () => {
  it("index.css reserva padding-bottom no body enquanto a barra está ativa", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toContain("body[data-booking-selection-bar]");
    expect(css).toMatch(/padding-bottom:\s*calc\(var\(--booking-selection-bar-height/);
    expect(css).toMatch(/min-width:\s*1024px/);
  });
});

describe("carrinho flutuante do orçamento público", () => {
  const quote = {
    id: "q-bar",
    booking_requests_enabled: true,
    public_access_code: "CODE",
    services: [{ id: "s1", service_type: "hotel", amount: 10, selection_mode: "optional", service_data: {} }],
    sections: [],
    choice_groups: [],
  } as any;

  const renderLauncher = (wrapper?: (node: React.ReactNode) => React.ReactNode) => {
    const node = (
      <BookingCartProvider quote={quote}>
        <BookingCartLauncher />
      </BookingCartProvider>
    );
    return render(<>{wrapper ? wrapper(node) : node}</>);
  };

  it("ativa o marcador enquanto montado e o remove ao desmontar", () => {
    const view = renderLauncher();
    expect(isBookingSelectionBarActive()).toBe(true);
    view.unmount();
    expect(isBookingSelectionBarActive()).toBe(false);
  });

  it("é renderizado via portal no body (fixed real, sem containing block)", () => {
    const view = renderLauncher((node) => (
      <div style={{ transform: "translateY(0)" }}>{node}</div>
    ));
    const buttons = view.getAllByRole("button", { name: /Abrir minha solicitação de reserva/i });
    expect(buttons.length).toBe(2);
    for (const btn of buttons) {
      expect(btn.parentElement?.parentElement).toBe(document.body);
      expect(btn.className).toContain("fixed");
    }
  });

  it("não usa mais a barra inferior larga", () => {
    renderLauncher();
    expect(document.querySelector('[data-testid="my-selection-bar"]')).toBeNull();
  });
});
