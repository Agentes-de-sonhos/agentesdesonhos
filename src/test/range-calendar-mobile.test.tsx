import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import { readFileSync } from "node:fs";
import type { DateRange } from "react-day-picker";
import { RangeCalendar } from "@/components/ui/range-calendar";

function setViewport(width: number) {
  (window as unknown as { innerWidth: number }).innerWidth = width;
  window.matchMedia = ((query: string) => ({
    matches: /min-width:\s*768px/.test(query) ? width >= 768 : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function Harness({ month = new Date(2026, 8, 1) }: { month?: Date }) {
  const [range, setRange] = useState<DateRange | undefined>();
  return (
    <>
      <RangeCalendar hint defaultMonth={month} selected={range} onSelect={setRange} />
      <output data-testid="out">
        {`${range?.from?.toISOString().slice(0, 10) ?? ""}|${range?.to?.toISOString().slice(0, 10) ?? ""}`}
      </output>
    </>
  );
}

const grid = () => document.querySelectorAll("table").length;
const caption = () =>
  document.querySelector("table")?.getAttribute("aria-labelledby")
    ? document.getElementById(document.querySelector("table")!.getAttribute("aria-labelledby")!)?.textContent?.trim()
    : document.querySelector(".text-sm.font-medium")?.textContent?.trim();
const swipe = (dx: number, dy = 0) => {
  const wrapper = document.querySelector("[data-range-calendar]") as HTMLElement;
  fireEvent.touchStart(wrapper, { touches: [{ clientX: 200, clientY: 200 }] });
  fireEvent.touchEnd(wrapper, { changedTouches: [{ clientX: 200 + dx, clientY: 200 + dy }] });
};
const clickDay = (day: number) => {
  const btn = Array.from(document.querySelectorAll<HTMLButtonElement>("table button")).find(
    (b) => b.textContent?.trim() === String(day) && !b.className.includes("outside"),
  );
  expect(btn).toBeTruthy();
  fireEvent.click(btn!);
};

describe("RangeCalendar — intervalo responsivo com setas e swipe", () => {
  beforeEach(() => setViewport(390));

  it("mostra um único mês no celular", () => {
    render(<Harness />);
    expect(grid()).toBe(1);
    expect(document.querySelector("[data-range-calendar]")?.getAttribute("data-months")).toBe("1");
  });

  it("mostra dois meses no desktop", () => {
    setViewport(1280);
    render(<Harness />);
    expect(grid()).toBe(2);
  });

  it("mantém setas com rótulos acessíveis", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Mês anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Próximo mês")).toBeInTheDocument();
  });

  it("swipe para a esquerda avança e para a direita retorna o mês", () => {
    render(<Harness />);
    const first = caption();
    swipe(-120);
    expect(caption()).not.toBe(first);
    swipe(120);
    expect(caption()).toBe(first);
  });

  it("ignora gestos curtos e verticais, preservando a rolagem", () => {
    render(<Harness />);
    const first = caption();
    swipe(-20);
    expect(caption()).toBe(first);
    swipe(-60, 200);
    expect(caption()).toBe(first);
  });

  it("preserva a ida ao navegar e conclui a volta no mês seguinte", () => {
    render(<Harness />);
    clickDay(20);
    expect(screen.getByTestId("out").textContent).toMatch(/^2026-09-20\|$/);
    fireEvent.click(screen.getByLabelText("Próximo mês"));
    clickDay(5);
    expect(screen.getByTestId("out").textContent).toBe("2026-09-20|2026-10-05");
  });

  it("exibe orientação contextual de ida e depois de volta", () => {
    render(<Harness />);
    expect(screen.getByText("Selecione a data de ida")).toBeInTheDocument();
    clickDay(20);
    expect(screen.getByText("Agora selecione a data de volta")).toBeInTheDocument();
  });

  it("o toque em um dia continua selecionando normalmente", () => {
    render(<Harness />);
    swipe(0, 0);
    clickDay(15);
    expect(screen.getByTestId("out").textContent).toMatch(/2026-09-15/);
  });
});

describe("calendários de intervalo não usam numberOfMonths fixo", () => {
  const files = [
    "src/components/quote/QuoteClientForm.tsx",
    "src/components/itinerary/ItineraryForm.tsx",
    "src/components/trip/TripForm.tsx",
    "src/components/trip/TripEditForm.tsx",
    "src/components/dashboard/start/BloqueiosAereosStartCard.tsx",
    "src/components/whitelabel/TripDatePicker.tsx",
  ];

  it("usa o componente compartilhado RangeCalendar sem numberOfMonths={2}", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("RangeCalendar");
      expect(source, file).not.toContain("numberOfMonths={2}");
    }
  });
});
