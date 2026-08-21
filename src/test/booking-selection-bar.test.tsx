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
import { MySelectionBar } from "@/components/quote/booking/MySelectionPanel";

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

describe("MySelectionBar", () => {
  const props = {
    count: 0,
    totalLabel: "Total",
    total: null,
    formatAmount: (v: number) => `R$ ${v}`,
    onOpen: () => {},
  };

  it("ativa o marcador enquanto montada e o remove ao desmontar", () => {
    const view = render(<MySelectionBar {...props} />);
    expect(isBookingSelectionBarActive()).toBe(true);
    const bar = view.getByTestId("my-selection-bar");
    expect(bar.className).toContain("fixed");
    expect(bar.className).toContain("bottom-0");
    expect(bar.className).toContain("lg:hidden");
    view.unmount();
    expect(isBookingSelectionBarActive()).toBe(false);
  });

  it("é renderizada via portal no body (fixed real, sem containing block)", () => {
    const view = render(
      <div style={{ transform: "translateY(0)" }}>
        <MySelectionBar {...props} />
      </div>,
    );
    const bar = view.getByTestId("my-selection-bar");
    expect(bar.parentElement).toBe(document.body);
  });

  it("continua ativo com itens selecionados", () => {
    render(<MySelectionBar {...props} count={2} total={300} />);
    expect(isBookingSelectionBarActive()).toBe(true);
  });
});
