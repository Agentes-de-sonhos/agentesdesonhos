import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useState } from "react";
import { TripPeriodField, parseYMD, toYMD } from "@/components/shared/TripPeriodField";

function Harness({ initial = { start: "", end: "" }, label }: { initial?: { start: string; end: string }; label?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TripPeriodField id="p" label={label} start={value.start} end={value.end} onChange={setValue} />
      <output data-testid="out">{`${value.start}|${value.end}`}</output>
    </>
  );
}

const open = (label = "Período da viagem") =>
  fireEvent.click(screen.getByLabelText(label, { selector: "button" }));

const clickDay = (day: number) => {
  const cells = Array.from(document.querySelectorAll<HTMLElement>("table td, table th"));
  const candidates = cells.flatMap((c) => {
    const btn = c.querySelector("button");
    return btn ? [btn] : c.getAttribute("role") === "gridcell" ? [c as unknown as HTMLButtonElement] : [];
  });
  const target = candidates.find(
    (b) => b.textContent?.trim() === String(day) && !b.hasAttribute("disabled") && !b.className.includes("outside"),
  );
  expect(target).toBeTruthy();
  fireEvent.click(target!);
};

const out = () => screen.getByTestId("out").textContent;

describe("TripPeriodField — seletor único compartilhado", () => {
  it("helpers YMD não sofrem D-1 (timezone local)", () => {
    const d = parseYMD("2026-10-18") as Date;
    expect(d.getDate()).toBe(18);
    expect(d.getMonth()).toBe(9);
    expect(toYMD(d)).toBe("2026-10-18");
    expect(toYMD(undefined)).toBe("");
    expect(parseYMD("")).toBeUndefined();
  });

  it("primeiro clique define o início, o calendário segue aberto e o segundo conclui", () => {
    render(<Harness initial={{ start: "", end: "" }} />);
    open();
    clickDay(5);
    const [s1, e1] = (out() || "").split("|");
    expect(s1).toMatch(/-05$/);
    expect(e1).toBe("");
    expect(screen.getByText("Selecione a data de volta")).toBeInTheDocument();
    clickDay(12);
    const [s2, e2] = (out() || "").split("|");
    expect(s2).toMatch(/-05$/);
    expect(e2).toMatch(/-12$/);
  });

  it("permite ida e volta no mesmo dia", () => {
    render(<Harness initial={{ start: "", end: "" }} />);
    open();
    clickDay(7);
    expect((out() || "").split("|")[1]).toBe("");
    clickDay(7);
    const [s3, e3] = (out() || "").split("|");
    expect(s3).toMatch(/-07$/);
    expect(e3).toBe(s3);
  });

  it("nunca grava um fim anterior ao início", () => {
    render(<Harness initial={{ start: "", end: "" }} />);
    open();
    clickDay(15);
    clickDay(9);
    const [start, end] = (out() || "").split("|");
    expect(end === "" || end >= start).toBe(true);
  });

  it("carrega datas existentes e preserva apenas o início quando não há fim", () => {
    const { unmount } = render(<Harness initial={{ start: "2026-10-18", end: "2026-10-25" }} />);
    expect(screen.getByLabelText("Período da viagem", { selector: "button" }).textContent).toContain("18/10/2026");
    expect(screen.getByLabelText("Período da viagem", { selector: "button" }).textContent).toContain("25/10/2026");
    unmount();
    render(<Harness initial={{ start: "2026-10-18", end: "" }} />);
    expect(out()).toBe("2026-10-18|");
    expect(screen.getByLabelText("Período da viagem", { selector: "button" }).textContent).toContain("18/10/2026");
  });

  it("limpar período devolve strings vazias", () => {
    render(<Harness initial={{ start: "2026-10-18", end: "2026-10-25" }} />);
    open();
    fireEvent.click(screen.getByText(/limpar/i));
    expect(out()).toBe("|");
  });

  it("aceita rótulos específicos por serviço", () => {
    render(<Harness label="Período da hospedagem" />);
    expect(screen.getByText("Período da hospedagem")).toBeInTheDocument();
  });
});

describe("Padronização dos períodos — arquivos unificados e preservados", () => {
  const read = async (p: string) => (await import("fs")).readFileSync(p, "utf8");

  const unified = [
    "src/components/crm/AddTripDialog.tsx",
    "src/components/crm/ImportQuoteAsOpportunityDialog.tsx",
    "src/components/crm/operations/CreateOperationDialog.tsx",
    "src/components/crm/operations/OperationDetailDialog.tsx",
    "src/components/crm/operations/OperationServicesTab.tsx",
    "src/components/reservas/NovaReservaDialog.tsx",
    "src/components/reservas/EditarRascunhoDialog.tsx",
    "src/components/reservas/ManualServiceDialog.tsx",
    "src/components/vendas/BookingHeader.tsx",
    "src/components/vendas/BookingFormDialog.tsx",
    "src/components/quote/QuoteDateEditor.tsx",
    "src/components/quote/QuoteServicesOrganizer.tsx",
    "src/components/quote/ServiceForms.tsx",
    "src/components/trip/TripServiceForms.tsx",
    "src/pages/TripWallet.tsx",
    "src/components/itinerary/ImportItineraryWizard.tsx",
    "src/components/itinerary/InstantiateTemplateDialog.tsx",
    "src/components/travel-requirements/TripStep.tsx",
  ];

  // Já unificados antes desta rodada, usando o mesmo seletor compartilhado.
  const alreadyUnified = ["src/components/crm/OpportunityForm.tsx"];

  it("todos os fluxos unificados usam o mesmo componente compartilhado", async () => {
    for (const file of unified) {
      const src = await read(file);
      expect(src, file).toContain("TripPeriodField");
    }
    for (const file of alreadyUnified) {
      const src = await read(file).catch(() => "");
      if (src) expect(src, file).toMatch(/TripPeriodField|TripDatePicker/);
    }
  });

  it("hospedagem e locação preservam os horários separados", async () => {
    const quote = await read("src/components/quote/ServiceForms.tsx");
    expect(quote).toContain("pickup_time");
    expect(quote).toContain("dropoff_time");
    const trip = await read("src/components/trip/TripServiceForms.tsx");
    expect(trip).toContain("pickup_time");
    expect(trip).toContain("dropoff_time");
  });

  it("aéreo, transfer, trem e paradas de cruzeiro continuam com datas próprias", async () => {
    const quote = await read("src/components/quote/ServiceForms.tsx");
    expect(quote).toContain("departure_date");
    expect(quote).toContain("return_date");
    const flight = await read("src/components/quote/FlightWizard.tsx").catch(() => "");
    if (flight) expect(flight).not.toContain("TripPeriodField");
  });

  it("filtros e datas financeiras não foram unificados", async () => {
    const reservas = await read("src/components/reservas/ReservasTab.tsx");
    expect(reservas).not.toContain("TripPeriodField");
  });
});
