import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EditarRascunhoDialog } from "@/components/reservas/EditarRascunhoDialog";
import type { TravelFile } from "@/types/travelFile";

// Fixtures 100% sintéticas: nenhum cliente, empresa ou reserva real.
const SYNTHETIC_CLIENT = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Pessoa Teste Alfa",
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

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "99999999-9999-4999-8999-999999999999" } }),
}));

vi.mock("@/hooks/useTravelFiles", () => ({
  useAgencyCompanies: () => ({
    companies: [SYNTHETIC_COMPANY],
    isLoading: false,
    isFetching: false,
    error: null,
    saveCompany: { mutateAsync: vi.fn(), isPending: false },
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

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const draft = (over: Partial<TravelFile> = {}): TravelFile =>
  ({
    id: "44444444-4444-4444-8444-444444444444",
    status: "draft",
    origin: "manual",
    contractor_type: "individual",
    client_id: SYNTHETIC_CLIENT.id,
    company_id: null,
    contact_client_id: null,
    trip_name: "Viagem Teste",
    primary_destination: "Cidade Teste",
    start_date: null,
    end_date: null,
    adults_count: 1,
    children_count: 0,
    passengers_count: 1,
    currency: "BRL",
    ...over,
  }) as unknown as TravelFile;

afterEach(cleanup);

describe("edição de rascunho: correção de contratante", () => {
  let onSave: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined);
  });

  it("mostra o contratante atual e permite trocar a pessoa vinculada", async () => {
    wrap(
      <EditarRascunhoDialog
        open
        onOpenChange={() => {}}
        file={draft()}
        currentClient={{ id: "old-id", name: "Pessoa Antiga" }}
        canEditContractor
        onSave={onSave}
      />,
    );

    expect(await screen.findByText(/Selecionado: Pessoa Antiga/)).toBeTruthy();

    await userEvent.click(await screen.findByText(SYNTHETIC_CLIENT.name));
    expect(screen.getByText(`Selecionado: ${SYNTHETIC_CLIENT.name}`)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      contractorType: "individual",
      clientId: SYNTHETIC_CLIENT.id,
      companyId: null,
    });
  });

  it("troca de PF para PJ mantendo client_id e company_id separados e grava contato", async () => {
    wrap(
      <EditarRascunhoDialog
        open
        onOpenChange={() => {}}
        file={draft()}
        currentClient={{ id: SYNTHETIC_CLIENT.id, name: SYNTHETIC_CLIENT.name }}
        canEditContractor
        onSave={onSave}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Empresa" }));
    await userEvent.click(await screen.findByText(SYNTHETIC_COMPANY.name));
    expect(screen.getByText(`Selecionada: ${SYNTHETIC_COMPANY.name}`)).toBeTruthy();

    // Contato responsável PJ escolhido depois de salvar o rascunho.
    await userEvent.click(await screen.findByText(SYNTHETIC_CLIENT.name));

    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      contractorType: "company",
      clientId: null,
      companyId: SYNTHETIC_COMPANY.id,
      contactClientId: SYNTHETIC_CLIENT.id,
    });
  });

  it("exige empresa quando o contratante é PJ e nada foi escolhido", async () => {
    wrap(
      <EditarRascunhoDialog
        open
        onOpenChange={() => {}}
        file={draft({ contractor_type: "company", client_id: null, company_id: null })}
        canEditContractor
        onSave={onSave}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("sem permissão de correção não mostra seletor e reenvia os vínculos originais", async () => {
    wrap(
      <EditarRascunhoDialog
        open
        onOpenChange={() => {}}
        file={draft({ status: "request_received", contact_client_id: "contato-1" })}
        onSave={onSave}
      />,
    );

    expect(screen.queryByText("Quem está contratando")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      contractorType: "individual",
      clientId: SYNTHETIC_CLIENT.id,
      companyId: null,
    });
  });
});
