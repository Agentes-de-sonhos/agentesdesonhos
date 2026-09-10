import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { AgencyCompaniesPanel } from "@/components/crm/AgencyCompaniesPanel";

/** Empresa sintética; nenhum cadastro real é usado. */
const SYNTHETIC_COMPANY = {
  id: "66666666-6666-4666-8666-666666666666",
  name: "Empresa Teste Delta",
  trade_name: null,
  cnpj: null,
  email: null,
  phone: null,
  contact_client_id: null,
};

const saveCompanyMutate = vi.fn();
const refetch = vi.fn();
let companies: (typeof SYNTHETIC_COMPANY)[] = [];
let listError: Error | null = null;

vi.mock("@/hooks/useTravelFiles", () => ({
  useAgencyCompanies: () => ({
    companies,
    isLoading: false,
    isFetching: false,
    error: listError,
    refetch,
    saveCompany: { mutateAsync: saveCompanyMutate, isPending: false },
  }),
}));

vi.mock("@/hooks/useClientsPaged", () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** Alterna as visões como a área de Clientes faz: o painel monta e desmonta. */
function ClientsAreaHarness() {
  const [view, setView] = useState<"pessoas" | "empresas">("empresas");
  const [requested, setRequested] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setView("pessoas")}>
        Ir para Pessoas
      </button>
      <button type="button" onClick={() => setView("empresas")}>
        Ir para Empresas
      </button>
      <button type="button" onClick={() => setRequested(true)}>
        Ação principal
      </button>
      {view === "empresas" ? (
        <AgencyCompaniesPanel
          createRequested={requested}
          onCreateHandled={() => setRequested(false)}
        />
      ) : (
        <p>Lista de pessoas</p>
      )}
    </div>
  );
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const dialogTitle = () => screen.queryByRole("heading", { name: /Nova empresa|Editar empresa/i });

beforeEach(() => {
  saveCompanyMutate.mockReset().mockResolvedValue(SYNTHETIC_COMPANY.id);
  refetch.mockReset();
  companies = [];
  listError = null;
});
afterEach(cleanup);

describe("pedido de cadastro de empresa é consumido uma única vez", () => {
  it("não reabre o cadastro ao voltar para Empresas depois de cancelar", async () => {
    const user = userEvent.setup();
    wrap(<ClientsAreaHarness />);

    await user.click(screen.getByRole("button", { name: "Ação principal" }));
    await waitFor(() => expect(dialogTitle()).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /^Cancelar$/ }));
    await waitFor(() => expect(dialogTitle()).toBeNull());

    await user.click(screen.getByRole("button", { name: "Ir para Pessoas" }));
    expect(screen.getByText("Lista de pessoas")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ir para Empresas" }));

    // o sinal antigo não reabre nada
    await waitFor(() => expect(screen.getByLabelText(/Buscar empresas/i)).toBeTruthy());
    expect(dialogTitle()).toBeNull();
  });

  it("não reabre o cadastro ao voltar para Empresas depois de salvar", async () => {
    const user = userEvent.setup();
    wrap(<ClientsAreaHarness />);

    await user.click(screen.getByRole("button", { name: "Ação principal" }));
    await waitFor(() => expect(dialogTitle()).toBeTruthy());
    await user.type(screen.getByLabelText(/Nome da empresa/i), SYNTHETIC_COMPANY.name);
    await user.click(screen.getByRole("button", { name: /^Salvar$/ }));
    await waitFor(() => expect(dialogTitle()).toBeNull());

    await user.click(screen.getByRole("button", { name: "Ir para Pessoas" }));
    await user.click(screen.getByRole("button", { name: "Ir para Empresas" }));
    await waitFor(() => expect(screen.getByLabelText(/Buscar empresas/i)).toBeTruthy());
    expect(dialogTitle()).toBeNull();
  });

  it("a ação principal continua abrindo o cadastro em cada novo clique", async () => {
    const user = userEvent.setup();
    wrap(<ClientsAreaHarness />);

    await user.click(screen.getByRole("button", { name: "Ação principal" }));
    await waitFor(() => expect(dialogTitle()).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Cancelar$/ }));
    await waitFor(() => expect(dialogTitle()).toBeNull());

    await user.click(screen.getByRole("button", { name: "Ação principal" }));
    await waitFor(() => expect(dialogTitle()).toBeTruthy());
  });
});

describe("falha ao carregar empresas não é lista vazia", () => {
  it("mostra o erro com tentar novamente e preserva a busca", async () => {
    const user = userEvent.setup();
    listError = new Error("network down");
    wrap(<AgencyCompaniesPanel />);

    await user.type(screen.getByLabelText(/Buscar empresas/i), "Delta");

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/Não foi possível carregar as empresas/i);
    // nunca sugere cadastrar duplicata nem finge lista vazia
    expect(screen.queryByText(/Nenhuma empresa/i)).toBeNull();
    expect((screen.getByLabelText(/Buscar empresas/i) as HTMLInputElement).value).toBe("Delta");

    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("sem erro, lista vazia continua com o estado vazio de sempre", () => {
    wrap(<AgencyCompaniesPanel />);
    expect(screen.getByText(/Nenhuma empresa cadastrada ainda/i)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("o formulário continua acessível durante a falha", async () => {
    const user = userEvent.setup();
    listError = new Error("permission denied");
    wrap(<AgencyCompaniesPanel />);

    await user.click(screen.getByRole("button", { name: /Nova empresa/i }));
    expect(screen.getByLabelText(/Nome da empresa/i)).toBeTruthy();
  });
});
