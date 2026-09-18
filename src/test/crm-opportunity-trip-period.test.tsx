import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const createOpportunity = vi.fn((_payload: any, opts: any) => opts?.onSuccess?.({ id: "opp-new" }));
const updateOpportunity = vi.fn(async () => ({}));
const syncFollowups = vi.fn(async () => ({}));

vi.mock("@/hooks/useCRM", () => ({
  useClients: () => ({ clients: [{ id: "c1", name: "Ana Martins" }] }),
  useOpportunities: () => ({ createOpportunity, updateOpportunity, isCreating: false }),
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ isMaster: false }) }));
vi.mock("@/hooks/useTeamMembers", () => ({ useTeamMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/useOpportunityFollowups", () => ({
  useOpportunityFollowups: () => ({ followups: [], syncFollowups, isSyncing: false }),
}));
vi.mock("@/components/shared/ClientSelector", () => ({
  ClientSelector: ({ onChange }: any) => (
    <button type="button" onClick={() => onChange({ id: "c1", name: "Ana Martins" })}>
      escolher cliente
    </button>
  ),
}));
vi.mock("./../components/crm/OpportunityRequestedServices", () => ({
  OpportunityRequestedServices: () => null,
}));

import { OpportunityForm } from "@/components/crm/OpportunityForm";

const openPeriod = () => fireEvent.click(screen.getByLabelText("Período da viagem", { selector: "button" }));

const clickDay = (day: number) => {
  const cells = Array.from(document.querySelectorAll<HTMLElement>("table td, table th"));
  const candidates = cells.flatMap((c) => {
    const btn = c.querySelector("button");
    return btn ? [btn] : (c.getAttribute("role") === "gridcell" ? [c as unknown as HTMLButtonElement] : []);
  });
  const target = candidates.find(
    (b) => b.textContent?.trim() === String(day) && !b.hasAttribute("disabled") && !b.className.includes("outside"),
  );
  expect(target).toBeTruthy();
  fireEvent.click(target!);
};

describe("Oportunidade — Período da viagem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe um único campo de período, sem os campos antigos separados", () => {
    render(<OpportunityForm onSuccess={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Período da viagem")).toBeInTheDocument();
    expect(screen.queryByText("Data Início")).not.toBeInTheDocument();
    expect(screen.queryByText("Data Fim")).not.toBeInTheDocument();
  });

  it("primeiro clique define a ida e o calendário segue aberto aguardando a volta", () => {
    render(<OpportunityForm onSuccess={() => {}} onCancel={() => {}} />);
    openPeriod();
    clickDay(10);
    expect(screen.getByText("Selecione a data de volta")).toBeInTheDocument();
  });

  it("intervalo completo é enviado como start_date/end_date em yyyy-MM-dd", async () => {
    render(<OpportunityForm onSuccess={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByText("escolher cliente"));
    fireEvent.change(screen.getByPlaceholderText("Paris, França"), { target: { value: "Orlando" } });
    openPeriod();
    clickDay(10);
    clickDay(17);
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    await waitFor(() => expect(createOpportunity).toHaveBeenCalled());
    const payload = createOpportunity.mock.calls[0][0];
    expect(payload.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.end_date >= payload.start_date).toBe(true);
  });

  it("permite ida e volta no mesmo dia", async () => {
    render(<OpportunityForm onSuccess={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByText("escolher cliente"));
    fireEvent.change(screen.getByPlaceholderText("Paris, França"), { target: { value: "Orlando" } });
    openPeriod();
    clickDay(12);
    clickDay(12);
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    await waitFor(() => expect(createOpportunity).toHaveBeenCalled());
    const payload = createOpportunity.mock.calls[0][0];
    expect(payload.start_date).toBe(payload.end_date);
  });

  it("período é opcional — salva sem datas", async () => {
    render(<OpportunityForm onSuccess={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByText("escolher cliente"));
    fireEvent.change(screen.getByPlaceholderText("Paris, França"), { target: { value: "Orlando" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    await waitFor(() => expect(createOpportunity).toHaveBeenCalled());
    const payload = createOpportunity.mock.calls[0][0];
    expect(payload.start_date).toBeUndefined();
    expect(payload.end_date).toBeUndefined();
  });

  it("edição carrega as duas datas existentes e permite limpar o período", async () => {
    const opportunity: any = {
      id: "o1",
      client_id: "c1",
      destination: "Orlando",
      start_date: "2026-10-18",
      end_date: "2026-10-25",
      adults_count: 2,
      children_count: 0,
      estimated_value: 100,
      stage: "new_contact",
    };
    render(<OpportunityForm opportunity={opportunity} onSuccess={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("18/10/2026 a 25/10/2026")).toBeInTheDocument();
    openPeriod();
    fireEvent.click(screen.getByRole("button", { name: "Limpar período" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(updateOpportunity).toHaveBeenCalled());
    expect(updateOpportunity.mock.calls[0][0].start_date).toBeUndefined();
    expect(updateOpportunity.mock.calls[0][0].end_date).toBeUndefined();
  });

  it("edição com somente start_date mantém a ida e permite completar a volta", async () => {
    const opportunity: any = {
      id: "o2",
      client_id: "c1",
      destination: "Orlando",
      start_date: "2026-10-18",
      end_date: null,
      adults_count: 2,
      children_count: 0,
      estimated_value: 0,
      stage: "new_contact",
    };
    render(<OpportunityForm opportunity={opportunity} onSuccess={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("18/10/2026 a selecione a volta")).toBeInTheDocument();
    openPeriod();
    clickDay(25);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(updateOpportunity).toHaveBeenCalled());
    const payload = updateOpportunity.mock.calls[0][0];
    expect(payload.start_date).toBe("2026-10-18");
    expect(payload.end_date).toBe("2026-10-25");
  });
});
