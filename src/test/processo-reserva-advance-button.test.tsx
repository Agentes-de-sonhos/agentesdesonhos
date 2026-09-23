// Foco: no fluxo unificado V2, o botão genérico "Avançar para Venda confirmada
// / Em operação" NÃO pode existir no Andamento do processo — a confirmação de
// venda acontece exclusivamente pelo CTA canônico "Confirmar venda e iniciar
// operação" (bloco Confirmação da venda). Etapas anteriores mantêm o Avançar.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import ProcessoReserva from "@/pages/ProcessoReserva";

const mocks = vi.hoisted(() => ({
  markViewed: vi.fn().mockResolvedValue(undefined),
  setStatus: vi.fn(),
  setResponsibles: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "agencia@exemplo.test", user_metadata: { full_name: "Agência" } },
  }),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/lib/agencyAdminNav", () => ({
  useAdminNav: () => ({
    isAgencyAdmin: false,
    crm: (tab = "funil") => `/crm/${tab}`,
    financeiro: "/financeiro",
    quote: (id: string) => `/orcamentos/${id}`,
    reservas: (id?: string) => (id ? `/reservas/${id}` : "/reservas"),
  }),
}));

vi.mock("@/hooks/useUnifiedWorkflow", () => ({
  useUnifiedWorkflowV2: () => ({
    enabled: true,
    resolved: true,
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  useTravelFileWorkflowLinks: () => ({
    operationId: null,
    saleId: null,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useConfirmTravelFileSale: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  isConfirmSaleFailure: () => false,
}));

vi.mock("@/hooks/useTravelFiles", () => ({
  useTravelFile: () => ({ data: DATA, isLoading: false, isError: false }),
  useAgencyTeamDirectory: () => ({ members: [], memberNames: {} }),
  useReservationsCenterAccess: () => ({ allowed: true, loading: false }),
  useTravelFileMutations: () => ({
    setStatus: { mutateAsync: mocks.setStatus },
    setResponsibles: { mutateAsync: mocks.setResponsibles },
    saveService: { mutateAsync: vi.fn() },
    saveManualData: { mutateAsync: vi.fn() },
    saveManualService: { mutateAsync: vi.fn() },
  }),
  useTravelFileNotes: () => ({
    notes: [],
    addNote: { mutateAsync: vi.fn(), isPending: false },
    deleteNote: { mutateAsync: vi.fn(), isPending: false },
  }),
  useTravelFilesPage: () => ({ markViewed: mocks.markViewed }),
}));

const FILE: any = {
  id: "cb0c1c37-0e97-4590-b233-8d0b33c76a72",
  agency_id: "agency-casa-nova",
  file_number: 5,
  file_number_display: "0000005",
  client_id: "client-1",
  opportunity_id: "opp-1",
  quote_id: "quote-1",
  root_request_id: "request-root",
  current_request_id: "request-current",
  revision: 1,
  protocol_snapshot: "PV-0005",
  responsible_user_id: null,
  responsible_team_member_id: null,
  operations_responsible_team_member_id: null,
  primary_destination: "Paris",
  destinations: ["Paris"],
  start_date: "2026-10-10",
  end_date: "2026-10-17",
  adults_count: 2,
  children_count: 0,
  passengers_count: 2,
  currency: "BRL",
  pricing_mode: "itemized",
  requested_amount: 29000,
  reconfirmed_amount: 29000,
  final_sale_amount: null,
  status: "awaiting_client",
  operational_status: "reconfirmation",
  financial_status: "pending",
  operation_id: null,
  opened_at: "2026-09-20T10:00:00Z",
  confirmed_at: null,
  cancelled_at: null,
  completed_at: null,
  cancellation_reason: null,
  created_at: "2026-09-20T10:00:00Z",
  updated_at: "2026-09-22T10:00:00Z",
  origin: "web_quote",
  contractor_type: "individual",
  company_id: null,
  contact_client_id: null,
  contact_snapshot: { name: "Cliente Teste" },
  trip_name: "Viagem Paris",
  workflow_version: 2,
};

const SERVICES: any[] = [
  {
    id: "svc-flight",
    file_id: FILE.id,
    service_type: "flight",
    product_name: "LATAM Airlines",
    supplier_name: "Sakura Consolidadora",
    operator_id: "bb4b24ab-7ece-4c97-8159-ced88770c413",
    city: null,
    destination: "Paris",
    country: "França",
    start_date: "2026-10-10",
    end_date: null,
    quantity: 1,
    passengers_count: 2,
    currency: "BRL",
    requested_amount: 20000,
    reconfirmed_amount: 20000,
    sold_amount: 20000,
    cost_amount: null,
    commission_amount: null,
    responsible_team_member_id: null,
    is_required: true,
    status: "booked",
    snapshot: { option_label: "Econômica" },
    created_at: "2026-09-20T10:00:00Z",
    financial_rule_status: "pending",
  },
  {
    id: "svc-hotel",
    file_id: FILE.id,
    service_type: "hotel",
    product_name: "Hôtel Belgrand",
    supplier_name: "HOTELDO",
    operator_id: "8e7fd48e-8386-4e22-93ff-a83503b9916e",
    city: "Paris",
    destination: "Paris",
    country: "França",
    start_date: "2026-10-10",
    end_date: "2026-10-17",
    quantity: 1,
    passengers_count: 2,
    currency: "BRL",
    requested_amount: 9000,
    reconfirmed_amount: 9000,
    sold_amount: 9000,
    cost_amount: null,
    commission_amount: null,
    responsible_team_member_id: null,
    is_required: true,
    status: "booked",
    snapshot: {},
    created_at: "2026-09-20T10:00:00Z",
    financial_rule_status: "pending",
  },
];

const DATA: any = {
  file: FILE,
  services: SERVICES,
  events: [],
  client: { id: "client-1", name: "Cliente Teste" },
  company: null,
  contact: null,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/reservas/${FILE.id}`]}>
        <Routes>
          <Route path="/reservas/:id" element={<ProcessoReserva />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProcessoReserva — Avançar genérico x CTA canônico no fluxo unificado V2", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockClear());
  });
  afterEach(() => {
    cleanup();
    FILE.status = "awaiting_client";
  });

  it("next=sale_confirmed: botão genérico ausente e CTA canônico presente", async () => {
    FILE.status = "awaiting_client"; // next = sale_confirmed
    renderPage();

    expect(await screen.findByText("Processo de reserva nº 0000005")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Confirmar venda e iniciar operação/i }),
    ).not.toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Avançar para Venda confirmada/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Avançar para Em operação/i })).not.toBeInTheDocument();
  });

  it("etapa anterior: botão genérico Avançar continua presente", async () => {
    FILE.status = "partially_available"; // next = awaiting_client
    renderPage();

    expect(await screen.findByText("Processo de reserva nº 0000005")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Avançar para Aguardando cliente/i }),
    ).toBeInTheDocument();
  });
});
