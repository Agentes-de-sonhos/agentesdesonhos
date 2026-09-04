import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventTypeFilter } from "@/components/agenda/EventTypeFilter";

const types = [
  { id: "compromisso", name: "Compromisso", color: "#111111" },
  { id: "trade", name: "Evento do Trade", color: "#222222" },
  { id: "venda", name: "Venda", color: "#333333" },
  { id: "lembrete", name: "Lembrete", color: "#444444" },
];

function renderBar(onToggle = vi.fn()) {
  return render(
    <EventTypeFilter
      eventTypes={types}
      hiddenTypes={[]}
      onToggleType={onToggle}
      leading={
        <>
          <div data-testid="agenda-view-selector">
            <button>Dia</button>
            <button>Semana</button>
            <button>Mês</button>
            <button>Ano</button>
          </div>
          <div data-testid="agenda-google-sync">
            <button>Conectar Google Calendar</button>
          </div>
        </>
      }
    />
  );
}

describe("Agenda toolbar", () => {
  it("renders view selector, Google Calendar and Filtrar in a single bar, in order", () => {
    renderBar();
    const bar = screen.getByTestId("agenda-toolbar");
    const selector = screen.getByTestId("agenda-view-selector");
    const google = screen.getByTestId("agenda-google-sync");
    const filtrar = screen.getByText("Filtrar");

    expect(bar).toContainElement(selector);
    expect(bar).toContainElement(google);
    expect(bar).toContainElement(filtrar);

    const order = Array.from(bar.children);
    expect(order.indexOf(selector)).toBeLessThan(order.indexOf(google));
    expect(order.indexOf(google)).toBeLessThan(
      order.indexOf(filtrar.closest("button")!)
    );
  });

  it("wraps on small screens with spacing and without horizontal scroll", () => {
    renderBar();
    const bar = screen.getByTestId("agenda-toolbar");
    expect(bar.className).toContain("flex-wrap");
    expect(bar.className).toContain("gap-4");
    expect(bar.className).toContain("overflow-x-hidden");
  });

  it("Filtrar toggles the event categories area", () => {
    const onToggle = vi.fn();
    renderBar(onToggle);
    expect(screen.queryByText("Evento do Trade")).toBeNull();
    fireEvent.click(screen.getByText("Filtrar"));
    expect(screen.getByText("Compromisso")).toBeTruthy();
    expect(screen.getByText("Evento do Trade")).toBeTruthy();
    expect(screen.getByText("Venda")).toBeTruthy();
    expect(screen.getByText("Lembrete")).toBeTruthy();

    fireEvent.click(screen.getByText("Venda"));
    expect(onToggle).toHaveBeenCalledWith("venda", true);
  });
});
