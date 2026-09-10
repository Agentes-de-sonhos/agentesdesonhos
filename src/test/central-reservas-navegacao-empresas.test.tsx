import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DIRECT_NAV_ITEMS } from "@/config/directNavItems";
import { ROUTE_PERMISSIONS } from "@/lib/routePermissions";
import { AgencyCompaniesPanel } from "@/components/crm/AgencyCompaniesPanel";

const SYNTHETIC_COMPANY = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Empresa Teste Gama",
  trade_name: null,
  cnpj: null,
  email: null,
  phone: null,
  contact_client_id: null,
};

const saveCompanyMutate = vi.fn();
let companies: (typeof SYNTHETIC_COMPANY)[] = [];

vi.mock("@/hooks/useTravelFiles", () => ({
  useAgencyCompanies: () => ({
    companies,
    isLoading: false,
    isFetching: false,
    error: null,
    saveCompany: { mutateAsync: saveCompanyMutate, isPending: false },
  }),
}));

vi.mock("@/hooks/useClientsPaged", () => ({
  useDebouncedValue: (value: string) => value,
}));

let permissions: string[] = [];
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (p: string) => permissions.includes(p) }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  saveCompanyMutate.mockReset().mockResolvedValue(SYNTHETIC_COMPANY.id);
  companies = [];
  permissions = ["clients.view", "clients.create", "clients.edit"];
});
afterEach(cleanup);

describe("Central de Reservas no menu principal", () => {
  it("aparece uma única vez, entre clientes e financeiro", () => {
    const keys = DIRECT_NAV_ITEMS.map((item) => item.url);
    const reservas = keys.filter((url) => url === "/reservas");
    expect(reservas).toHaveLength(1);

    const idxClientes = keys.findIndex((url) => url.includes("/crm") || url.includes("clientes"));
    const idxReservas = keys.indexOf("/reservas");
    const idxFinanceiro = keys.findIndex((url) => url.includes("financeiro"));
    expect(idxReservas).toBeGreaterThan(idxClientes);
    expect(idxFinanceiro).toBeGreaterThan(idxReservas);
  });

  it("exige permissão de reservas na rota /reservas", () => {
    const rule = ROUTE_PERMISSIONS.find((r) => r.prefix === "/reservas");
    expect(rule?.any).toContain("reservations.view");
  });
});

describe("empresas na área de Clientes", () => {
  it("mostra estado vazio útil e permite cadastrar empresa só com o nome", async () => {
    const user = userEvent.setup();
    wrap(<AgencyCompaniesPanel />);

    expect(screen.getByText(/Nenhuma empresa cadastrada ainda/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Nova empresa/i }));
    await user.type(screen.getByLabelText(/Nome da empresa/i), SYNTHETIC_COMPANY.name);
    await user.click(screen.getByRole("button", { name: /^Salvar$/ }));

    await waitFor(() => expect(saveCompanyMutate).toHaveBeenCalledTimes(1));
    const payload = saveCompanyMutate.mock.calls[0][0];
    expect(payload.name).toBe(SYNTHETIC_COMPANY.name);
    expect(payload.companyId).toBeNull();
    // empresa pode existir sozinha: nenhum contato é inventado
    expect(payload.contactClientId).toBeUndefined();
  });

  it("bloqueia salvar empresa sem nome", async () => {
    const user = userEvent.setup();
    wrap(<AgencyCompaniesPanel />);

    await user.click(screen.getByRole("button", { name: /Nova empresa/i }));
    await user.click(screen.getByRole("button", { name: /^Salvar$/ }));

    expect(saveCompanyMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("esconde criar e editar de quem não tem permissão", () => {
    companies = [SYNTHETIC_COMPANY];
    permissions = ["clients.view"];
    wrap(<AgencyCompaniesPanel />);

    expect(screen.queryByRole("button", { name: /Nova empresa/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Editar/i })).toBeNull();
    expect(screen.getByText(SYNTHETIC_COMPANY.name)).toBeTruthy();
  });
});
