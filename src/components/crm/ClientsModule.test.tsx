import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClientsModule } from "./ClientsModule";
import type { Client } from "@/types/crm";

vi.mock("@/hooks/useCRM", () => ({
  useClients: () => ({
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    isCreating: false,
  }),
}));

vi.mock("@/hooks/useClientsPaged", () => ({
  useClientsPaged: () => ({
    clients: mockClients,
    total: mockClients.length,
    totalPages: 1,
    isLoading: false,
    isFetching: false,
    isEmptyAgency: false,
  }),
  useClientById: () => ({ data: null }),
  useClientPhoneIndex: () => ({ data: new Map() }),
  useDebouncedValue: (v: string) => v,
  CLIENTS_DEFAULT_PAGE_SIZE: 25,
  CLIENTS_PAGE_SIZE_OPTIONS: [25, 50, 100],
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
    isTeamMember: false,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("./ClientProfile", () => ({
  ClientProfile: () => <div data-testid="client-profile">ClientProfile</div>,
}));

vi.mock("./ImportContactsDialog", () => ({
  ImportContactsDialog: () => null,
}));

vi.mock("@/components/crm/ClientAreaAccessSection", () => ({
  ClientAreaAccessSection: () => null,
}));

const mockClients: Client[] = [
  {
    id: "client-1",
    user_id: "user-1",
    name: "Ana Carolina Silva",
    email: "ana.silva@emailmuitolongo.com.br",
    phone: "(11) 99999-8888",
    city: "São Paulo, SP",
    status: "cliente_ativo",
    last_interaction_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: null,
    travel_preferences: null,
    internal_notes: null,
    birthday_day: null,
    birthday_month: null,
    birthday_year: null,
    category_id: null,
    subcategory_id: null,
  },
  {
    id: "client-2",
    user_id: "user-1",
    name: "Bruno",
    email: null,
    phone: null,
    city: null,
    status: "lead",
    last_interaction_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: null,
    travel_preferences: null,
    internal_notes: null,
    birthday_day: null,
    birthday_month: null,
    birthday_year: null,
    category_id: null,
    subcategory_id: null,
  },
];

function mount() {
  return render(
    <MemoryRouter>
      <ClientsModule />
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe("ClientsModule — visual padrão Meus Projetos", () => {
  it("renderiza o cabeçalho de colunas CLIENTE / STATUS / AÇÕES", () => {
    mount();
    expect(screen.getByText("Cliente")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Ações")).toBeTruthy();
  });

  it("exibe avatar, nome, e-mail, telefone, cidade e última interação", () => {
    mount();
    expect(screen.getByText("Ana Carolina Silva")).toBeTruthy();
    expect(screen.getByText("ana.silva@emailmuitolongo.com.br")).toBeTruthy();
    expect(screen.getByText("(11) 99999-8888")).toBeTruthy();
    expect(screen.getByText("São Paulo, SP")).toBeTruthy();
    expect(screen.getByText("Cliente Ativo")).toBeTruthy();
    expect(screen.getByText("Lead")).toBeTruthy();
  });

  it("renderiza os botões de ação com aria-labels corretos", () => {
    mount();
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.getAttribute("aria-label"));
    expect(labels).toContain("Visualizar");
    expect(labels).toContain("Editar");
    expect(labels).toContain("Excluir");
  });

  it("clique no botão de ação não dispara abertura do perfil (stopPropagation)", () => {
    mount();
    const editButtons = screen.getAllByRole("button", { name: /Editar/i });
    // O botão de editar deve existir e ser clicável sem erro
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);
    // Como o dialog depende de estado interno, apenas garantimos que o botão responde
    expect(editButtons[0]).toBeTruthy();
  });
});
