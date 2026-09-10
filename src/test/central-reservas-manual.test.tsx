import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { NovaReservaDialog } from "@/components/reservas/NovaReservaDialog";
import { EditarRascunhoDialog } from "@/components/reservas/EditarRascunhoDialog";
import { ManualServiceDialog } from "@/components/reservas/ManualServiceDialog";
import {
  FILE_STATUS_LABELS,
  RESERVAS_FILTERS,
} from "@/lib/travelFiles";
import { nextFileStatus, isFileOverdue } from "@/lib/travelFileWorkflow";
import type { TravelFile } from "@/types/travelFile";

// ---------------------------------------------------------------------------
// Fixtures 100% sintéticas: nenhum cliente, empresa ou reserva real.
// ---------------------------------------------------------------------------
const SYNTHETIC_CLIENT = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Cliente Teste Alfa",
  email: "alfa@exemplo.test",
  phone: null,
};
const SYNTHETIC_COMPANY = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Empresa Teste Beta",
  trade_name: null,
  cnpj: null,
  email: null,
  phone: null,
  contact_client_id: null,
};

// Identidade sintética: a busca de clientes é isolada por usuário.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "99999999-9999-4999-8999-999999999999" } }),
}));

const createReservationMutate = vi.fn();
const saveCompanyMutate = vi.fn();

vi.mock("@/hooks/useTravelFiles", () => ({
  useAgencyCompanies: () => ({
    companies: [SYNTHETIC_COMPANY],
    isLoading: false,
    isFetching: false,
    error: null,
    saveCompany: { mutateAsync: saveCompanyMutate, isPending: false },
  }),
  useCreateManualReservation: () => ({
    mutateAsync: createReservationMutate,
    isPending: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    ilike: () => builder,
    then: (resolve: any) => resolve({ data: [SYNTHETIC_CLIENT], error: null }),
  };
  return { supabase: { from: () => builder } };
});

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a) } }));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  createReservationMutate.mockReset();
  saveCompanyMutate.mockReset();
  toastSuccess.mockReset();
  createReservationMutate.mockResolvedValue({
    fileId: "33333333-3333-4333-8333-333333333333",
    fileNumber: "0000123",
    duplicate: false,
  });
  saveCompanyMutate.mockResolvedValue(SYNTHETIC_COMPANY.id);
});
afterEach(cleanup);

describe("cadastro manual de reserva (PF e PJ)", () => {
  it("salva rascunho de pessoa física com contratante e viagem", async () => {
    const user = userEvent.setup();
    wrap(<NovaReservaDialog open onOpenChange={() => {}} />);

    await waitFor(() => expect(screen.getByText(SYNTHETIC_CLIENT.name)).toBeTruthy());
    await user.click(screen.getByText(SYNTHETIC_CLIENT.name));
    await user.type(screen.getByLabelText(/Nome da viagem/i), "Viagem sintética");
    await user.click(screen.getByRole("button", { name: /Salvar rascunho/i }));

    await waitFor(() => expect(createReservationMutate).toHaveBeenCalledTimes(1));
    const payload = createReservationMutate.mock.calls[0][0];
    expect(payload.contractorType).toBe("individual");
    expect(payload.clientId).toBe(SYNTHETIC_CLIENT.id);
    expect(payload.companyId).toBeNull();
    expect(payload.manualKey).toBeTruthy();
  });

  it("exige contratante antes de salvar e preserva o que já foi digitado", async () => {
    const user = userEvent.setup();
    wrap(<NovaReservaDialog open onOpenChange={() => {}} />);

    await user.type(screen.getByLabelText(/Nome da viagem/i), "Viagem sem contratante");
    await user.click(screen.getByRole("button", { name: /Salvar rascunho/i }));

    expect(createReservationMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/contratando/i);
    expect((screen.getByLabelText(/Nome da viagem/i) as HTMLInputElement).value).toBe(
      "Viagem sem contratante",
    );
  });

  it("nunca envia o id da empresa no lugar do cliente na reserva de empresa", async () => {
    const user = userEvent.setup();
    wrap(<NovaReservaDialog open onOpenChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: /^Empresa$/ }));
    await user.click(screen.getByText(SYNTHETIC_COMPANY.name));
    await user.type(screen.getByLabelText(/Destino/i), "Destino sintético");
    await user.click(screen.getByRole("button", { name: /Salvar rascunho/i }));

    await waitFor(() => expect(createReservationMutate).toHaveBeenCalledTimes(1));
    const payload = createReservationMutate.mock.calls[0][0];
    expect(payload.contractorType).toBe("company");
    expect(payload.companyId).toBe(SYNTHETIC_COMPANY.id);
    expect(payload.clientId).toBeNull();
    // empresa pode existir sem contato responsável
    expect(payload.contactClientId).toBeNull();
  });

  it("mantém a mesma chave de intenção quando o salvamento falha (sem duplicar)", async () => {
    const user = userEvent.setup();
    createReservationMutate.mockRejectedValueOnce(new Error("Falha temporária"));
    wrap(<NovaReservaDialog open onOpenChange={() => {}} />);

    await waitFor(() => expect(screen.getByText(SYNTHETIC_CLIENT.name)).toBeTruthy());
    await user.click(screen.getByText(SYNTHETIC_CLIENT.name));
    await user.type(screen.getByLabelText(/Nome da viagem/i), "Viagem com retry");
    await user.click(screen.getByRole("button", { name: /Salvar rascunho/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Salvar rascunho/i }));

    await waitFor(() => expect(createReservationMutate).toHaveBeenCalledTimes(2));
    expect(createReservationMutate.mock.calls[0][0].manualKey).toBe(
      createReservationMutate.mock.calls[1][0].manualKey,
    );
  });

  it("cancelar fecha o diálogo sem salvar nada", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    wrap(<NovaReservaDialog open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: /^Cancelar$/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createReservationMutate).not.toHaveBeenCalled();
    expect(saveCompanyMutate).not.toHaveBeenCalled();
  });
});

const draftFile = {
  id: "44444444-4444-4444-8444-444444444444",
  origin: "manual",
  status: "draft",
  contractor_type: "company",
  client_id: null,
  company_id: SYNTHETIC_COMPANY.id,
  contact_client_id: null,
  trip_name: "Viagem sintética",
  primary_destination: "Destino sintético",
  start_date: null,
  end_date: null,
  adults_count: 2,
  children_count: 0,
  currency: "BRL",
} as unknown as TravelFile;

describe("edição do rascunho manual", () => {
  it("não toca no contratante quando só o destino muda (patch parcial)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    wrap(<EditarRascunhoDialog open onOpenChange={() => {}} file={draftFile} onSave={onSave} />);

    const destino = screen.getByLabelText(/Destino/i) as HTMLInputElement;
    expect(destino.value).toBe("Destino sintético");
    await user.clear(destino);
    await user.type(destino, "Outro destino");
    await user.click(screen.getByRole("button", { name: /Salvar alterações/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const input = onSave.mock.calls[0][0];
    // Campos não alterados ficam fora do payload: o servidor preserva o vínculo.
    expect(input).not.toHaveProperty("contractorType");
    expect(input).not.toHaveProperty("companyId");
    expect(input).not.toHaveProperty("clientId");
    expect(input).not.toHaveProperty("contactClientId");
    expect(input.primaryDestination).toBe("Outro destino");
  });


  it("bloqueia salvar sem viagem nem destino", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    wrap(<EditarRascunhoDialog open onOpenChange={() => {}} file={draftFile} onSave={onSave} />);

    await user.clear(screen.getByLabelText(/Nome da viagem/i));
    await user.clear(screen.getByLabelText(/Destino/i));
    await user.click(screen.getByRole("button", { name: /Salvar alterações/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

describe("serviço manual da reserva", () => {
  it("exige o nome do serviço e aceita datas opcionais", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    wrap(<ManualServiceDialog open onOpenChange={() => {}} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /^Salvar/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();

    await user.type(screen.getByLabelText(/Nome do serviço/i), "Hotel sintético");
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0];
    expect(payload.productName).toBe("Hotel sintético");
    expect(payload.startDate).toBeNull();
    expect(payload.requestedAmount).toBeNull();
  });

  it("não mostra nem envia valores para quem não tem permissão financeira", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    wrap(<ManualServiceDialog open onOpenChange={() => {}} onSave={onSave} canEditAmount={false} />);

    expect(screen.queryByLabelText(/Valor/i)).toBeNull();
    await user.type(screen.getByLabelText(/Nome do serviço/i), "Transfer sintético");
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].requestedAmount).toBeNull();
  });

  it("mostra o campo de valor para quem tem permissão financeira", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    wrap(<ManualServiceDialog open onOpenChange={() => {}} onSave={onSave} canEditAmount />);

    await user.type(screen.getByLabelText(/Nome do serviço/i), "Passeio sintético");
    await user.type(screen.getByLabelText(/Valor/i), "1500,50");
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].requestedAmount).toBe(1500.5);
  });

  it("preserva a situação já registrada ao editar e apaga a observação quando esvaziada", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const service: any = {
      id: "33333333-3333-4333-8333-333333333333",
      service_type: "hotel",
      product_name: "Hotel sintético",
      status: "booked",
      quantity: 1,
      snapshot: { notes: "observação antiga" },
    };
    wrap(<ManualServiceDialog open onOpenChange={() => {}} onSave={onSave} service={service} />);

    await user.clear(screen.getByLabelText(/Observa/i));
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0];
    expect(payload.status).toBe("booked");
    expect(payload.notes).toBe("");
  });
});

describe("rascunho no fluxo de status", () => {
  it("usa o rótulo Rascunho e preserva Solicitação recebida do site", () => {
    expect(FILE_STATUS_LABELS.draft).toBe("Rascunho");
    expect(FILE_STATUS_LABELS.request_received).toMatch(/Solicita/i);
  });

  it("oferece o filtro de rascunhos separado dos demais estados", () => {
    const draftFilter = RESERVAS_FILTERS.find((f) => f.id === "draft");
    expect(draftFilter?.statuses).toEqual(["draft"]);
    for (const filter of RESERVAS_FILTERS) {
      if (filter.id === "draft") continue;
      expect(filter.statuses).not.toContain("draft");
    }
  });

  it("rascunho avança para reconfirmação e nunca conta como atrasado", () => {
    expect(nextFileStatus("draft")).toBe("awaiting_reconfirmation");
    expect(isFileOverdue({ ...draftFile } as any)).toBe(false);
  });
});
