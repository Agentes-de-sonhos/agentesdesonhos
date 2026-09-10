import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import ProcessoReserva from "@/pages/ProcessoReserva";

// Identidade sintética.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "99999999-9999-4999-8999-999999999999", email: "teste@exemplo.test" },
  }),
}));

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpc(...args),
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    }),
  },
}));

// Layout pesado fora do caminho testado.
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Permissões amplas: o foco aqui é a moeda, não o gate.
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

// Hooks reais de mutação (atravessam o RPC simulado); consultas são fixadas.
vi.mock("@/hooks/useTravelFiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useTravelFiles")>();
  return {
    ...actual,
    useTravelFile: () => ({ data: DATA, isLoading: false }),
    useAgencyTeamDirectory: () => ({ members: [], memberNames: {} }),
    useReservationsCenterAccess: () => ({ allowed: true, loading: false }),
    useTravelFileNotes: () => ({
      notes: [],
      addNote: { mutateAsync: vi.fn() },
      deleteNote: { mutateAsync: vi.fn() },
    }),
    useTravelFilesPage: () => ({ markViewed: vi.fn().mockResolvedValue(undefined) }),
  };
});

const FILE_ID = "44444444-4444-4444-8444-444444444444";

// Reserva manual em REAL, com um serviço lançado em DÓLAR.
const FILE: any = {
  id: FILE_ID,
  agency_id: "88888888-8888-4888-8888-888888888888",
  origin: "manual",
  status: "draft",
  revision: 1,
  file_number_display: "0000001",
  contractor_type: "individual",
  client_id: null,
  company_id: null,
  contact_client_id: null,
  contact_snapshot: null,
  protocol_snapshot: null,
  quote_id: null,
  opportunity_id: null,
  trip_name: "Viagem Teste",
  primary_destination: "Lisboa",
  start_date: null,
  end_date: null,
  passengers_count: 2,
  adults_count: 2,
  children_count: 0,
  currency: "BRL",
  requested_amount: 0,
  reconfirmed_amount: null,
  final_sale_amount: null,
  responsible_team_member_id: null,
  operations_responsible_team_member_id: null,
  opened_at: "2026-09-01T10:00:00Z",
  confirmed_at: null,
};

const SERVICE_USD: any = {
  id: "55555555-5555-4555-8555-555555555555",
  file_id: FILE_ID,
  service_type: "hotel",
  product_name: "Hotel em Lisboa",
  supplier_name: null,
  city: null,
  destination: null,
  country: null,
  start_date: null,
  end_date: null,
  quantity: 1,
  passengers_count: null,
  currency: "USD",
  requested_amount: 100,
  reconfirmed_amount: null,
  sold_amount: null,
  cost_amount: null,
  commission_amount: null,
  responsible_team_member_id: null,
  is_required: false,
  status: "requested",
  snapshot: {},
  created_at: "2026-09-01T10:00:00Z",
};

const DATA: any = {
  file: FILE,
  services: [SERVICE_USD],
  events: [],
  client: null,
  company: null,
  contact: null,
};

let queryClient: QueryClient;

const wrap = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/reservas/${FILE_ID}`]}>
        <Routes>
          <Route path="/reservas/:id" element={<ProcessoReserva />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const manualSaveCalls = () =>
  rpc.mock.calls.filter(([fn]) => fn === "travel_file_service_manual_save");

beforeEach(() => rpc.mockClear());
afterEach(cleanup);

describe("moeda do serviço manual na edição", () => {
  it("editar só o nome de serviço em USD preserva USD no rótulo e no envio", async () => {
    const user = userEvent.setup();
    wrap();

    // Abre a edição pelo caminho real: botão Editar do cartão do serviço.
    await user.click(await screen.findByRole("button", { name: /^Editar$/ }));

    // O rótulo do valor segue a moeda do serviço, não a da reserva (BRL).
    expect(await screen.findByText("Valor (USD)")).toBeTruthy();

    const nome = screen.getByLabelText(/Nome do servi/i);
    await user.clear(nome);
    await user.type(nome, "Hotel em Lisboa — 4 noites");
    await user.click(screen.getByRole("button", { name: /Salvar servi/i }));

    await waitFor(() => expect(manualSaveCalls()).toHaveLength(1));
    const payload = manualSaveCalls()[0][1]._payload;
    expect(payload.service_id).toBe(SERVICE_USD.id);
    expect(payload.product_name).toBe("Hotel em Lisboa — 4 noites");
    // Regressão: antes da correção isto ia como BRL e reclassificava o valor.
    expect(payload.currency).toBe("USD");
    // Situação e valor atuais preservados.
    expect(payload.status).toBe("requested");
    expect(payload.requested_amount).toBe(100);
  });

  it("serviço novo usa a moeda da reserva e recarrega lista e ficha", async () => {
    const user = userEvent.setup();
    wrap();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(
      await screen.findByRole("button", { name: /Acrescentar servi/i }),
    );

    // Fallback: sem serviço em edição, vale a moeda da reserva.
    expect(await screen.findByText("Valor (BRL)")).toBeTruthy();

    await user.type(screen.getByLabelText(/Nome do servi/i), "Transfer de chegada");
    await user.click(screen.getByRole("button", { name: /Salvar servi/i }));

    await waitFor(() => expect(manualSaveCalls()).toHaveLength(1));
    const payload = manualSaveCalls()[0][1]._payload;
    expect(payload.service_id).toBeNull();
    expect(payload.currency).toBe("BRL");

    // O hook refaz as consultas da ficha e da lista após salvar.
    await waitFor(() => {
      const keys = invalidateSpy.mock.calls.map(([arg]: any[]) => arg?.queryKey?.[0]);
      expect(keys).toContain("travel-file");
      expect(keys).toContain("travel-files-page");
    });
  });
});
