import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("@/components/shared/ClientSelector", () => ({
  ClientSelector: ({ onChange }: any) => (
    <button type="button" onClick={() => onChange({ id: "c1", name: "Ana Martins" })}>
      escolher cliente
    </button>
  ),
}));

vi.mock("@/components/ui/PlacesAutocomplete", () => ({
  PlacesAutocomplete: ({ value, onChange }: any) => (
    <input
      aria-label="Destino Principal"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

import { TripForm } from "@/components/trip/TripForm";

/**
 * A carteira digital recebe as datas como texto "YYYY-MM-DD" (ex.: da
 * Operações). new Date("2026-10-30") é interpretado como UTC e, no Brasil,
 * vira 29/10 — o erro dos prints. O formulário deve preservar o dia exato.
 */
describe("TripForm — datas informadas por outro módulo não desviam um dia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaultValues 2026-10-30 → 2026-11-02 são exibidas e enviadas sem desvio", async () => {
    const onSubmit = vi.fn();
    render(
      <TripForm
        onSubmit={onSubmit}
        defaultValues={{ start_date: "2026-10-30", end_date: "2026-11-02" }}
      />,
    );

    expect(screen.getByText("30/10/2026 → 02/11/2026")).toBeInTheDocument();
    expect(screen.getByText("4 dias de viagem")).toBeInTheDocument();

    fireEvent.click(screen.getByText("escolher cliente"));
    fireEvent.change(screen.getByLabelText("Destino Principal"), {
      target: { value: "Orlando" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Criar Viagem|Criar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      start_date: "2026-10-30",
      end_date: "2026-11-02",
    });
  });

  it("datas com timestamp ISO do rascunho preservam o dia local", () => {
    const onSubmit = vi.fn();
    // Rascunho salvo pelo navegador gera timestamps ISO: meia-noite local
    // (UTC-3) é serializada como 03:00Z do mesmo dia.
    render(
      <TripForm
        onSubmit={onSubmit}
        defaultValues={{
          start_date: "2026-10-30T03:00:00.000Z",
          end_date: "2026-11-02T03:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByText("30/10/2026 → 02/11/2026")).toBeInTheDocument();
  });
});
