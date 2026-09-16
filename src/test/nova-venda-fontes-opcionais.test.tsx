/**
 * Regressão: a Gestão Financeira não pode bloquear a criação da venda apenas
 * porque a oportunidade/operação não tem Carteira Digital nem Orçamento.
 * Carteira e Orçamento são opcionais; sem serviços importáveis o wizard ganha
 * a etapa Produtos e o bloqueio ocorre lá (e na Revisão), não em Fontes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { crmStepsFor, NewSaleWizard } from "@/components/financial/NewSaleWizard";
import { StepOperationSources } from "@/components/financial/import/OperationImportSteps";
import type { OperationBundle } from "@/hooks/useOperationSources";

const candidate = {
  key: "opp-1",
  opportunityId: "opp-1",
  clientId: "client-1",
  clientName: "Maria Silva",
  destination: "Orlando",
  startDate: null,
  endDate: null,
  estimatedValue: 0,
  hasOpportunity: true,
  tripIds: [] as string[],
  quoteIds: [] as string[],
  operationId: null,
  updatedAt: null,
};

let bundleMock: OperationBundle | null = null;
let bundleLoading = false;

const searchResults = [candidate];
vi.mock("@/hooks/useOperationSources", () => ({
  useOperationSearch: () => ({ data: searchResults, isFetching: false }),
  useOperationBundle: () => ({ data: bundleMock, isFetching: bundleLoading }),
}));
const financialApi = { createSale: vi.fn(), createSaleProduct: vi.fn() };
vi.mock("@/hooks/useFinancial", () => ({ useFinancial: () => financialApi }));
const sellersResult = { sellers: [] };
vi.mock("@/hooks/useSellers", () => ({ useSellers: () => sellersResult }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
const termsResult = { data: { byOperator: new Map() } };
vi.mock("@/hooks/useAgencySupplierTerms", () => ({ useAgencySupplierTerms: () => termsResult }));
const toastResult = { toast: vi.fn() };
vi.mock("@/hooks/use-toast", () => ({ useToast: () => toastResult }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));
vi.mock("@/components/shared/ClientSelector", () => ({
  ClientSelector: () => <div data-testid="client-selector" />,
}));
vi.mock("@/components/ui/PlacesAutocomplete", () => ({
  PlacesAutocomplete: (p: any) => (
    <input aria-label="destino" value={p.value || ""} onChange={(e) => p.onChange?.(e.target.value)} />
  ),
}));
vi.mock("@/components/financial/SupplierSelector", () => ({
  SupplierSelector: () => <div data-testid="supplier-selector" />,
}));

const emptyBundle = (over: Partial<OperationBundle> = {}): OperationBundle =>
  ({
    clientId: "client-1",
    clientName: "Maria Silva",
    destination: "Orlando",
    notes: "Observações da oportunidade",
    wallets: [],
    quotes: [],
    hasSale: false,
    ...over,
  } as unknown as OperationBundle);

const quoteSource = {
  id: "q1",
  label: "Orçamento Orlando",
  subtitle: "3 serviços",
  total: 5000,
  services: [
    {
      id: "qs1",
      service_type: "hotel",
      amount: 5000,
      service_data: { hotel_name: "Hotel Riviera", check_in: "2026-03-10" },
    },
  ],
};

const renderWizard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NewSaleWizard open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
};

const goToSources = async () => {
  fireEvent.click(screen.getByText(/Importar de uma operação/i));
  fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
  fireEvent.click(await screen.findByText("Maria Silva"));
  fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
};

describe("crmStepsFor", () => {
  it("inclui a etapa Produtos quando não há serviços importáveis", () => {
    expect(crmStepsFor(false)).toEqual(["origin", "locate", "sources", "confirm", "products", "review"]);
  });
  it("mantém o fluxo atual quando há serviços importáveis", () => {
    expect(crmStepsFor(true)).toEqual(["origin", "locate", "sources", "confirm", "review"]);
  });
});

describe("etapa Fontes — Carteira e Orçamento opcionais", () => {
  const noop = () => {};
  it("explica que sem produtos o cadastro é manual quando não há fontes", () => {
    render(
      <StepOperationSources
        bundle={emptyBundle()}
        loading={false}
        walletId={null}
        setWalletId={noop}
        quoteId={null}
        setQuoteId={noop}
        precedence={{ details: "wallet", values: "quote" }}
        setPrecedence={noop}
        pairs={[]}
        divergences={[]}
        excluded={new Set()}
        toggleExcluded={noop}
      />,
    );
    expect(screen.getByText(/Carteira Digital e Orçamento são opcionais/i)).toBeInTheDocument();
    expect(screen.getByText(/e não precisa ter/i)).toBeInTheDocument();
    expect(screen.getByText(/cadastre os produtos manualmente/i)).toBeInTheDocument();
  });

  it("avisa quando existem fontes, mas nenhum serviço importável", () => {
    render(
      <StepOperationSources
        bundle={emptyBundle({ quotes: [{ ...quoteSource, services: [] }] as any })}
        loading={false}
        walletId={null}
        setWalletId={noop}
        quoteId={null}
        setQuoteId={noop}
        precedence={{ details: "wallet", values: "quote" }}
        setPrecedence={noop}
        pairs={[]}
        divergences={[]}
        excluded={new Set()}
        toggleExcluded={noop}
      />,
    );
    expect(screen.getByText(/não possuem serviços importáveis/i)).toBeInTheDocument();
  });
});

describe("wizard Nova Venda — importação sem Carteira e sem Orçamento", () => {
  beforeEach(() => {
    bundleMock = null;
    bundleLoading = false;
  });

  it("habilita Continuar após o carregamento e insere a etapa Produtos", async () => {
    bundleMock = emptyBundle();
    renderWizard();
    await goToSources();

    const continuar = screen.getByRole("button", { name: /Continuar/i });
    await waitFor(() => expect(continuar).not.toBeDisabled());
    expect(screen.getByText("Produtos")).toBeInTheDocument();

    // Confirmar: cliente, destino e observações vieram da oportunidade
    fireEvent.click(continuar);
    expect(await screen.findByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Orlando")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Observações da oportunidade")).toBeInTheDocument();

    // Produtos: sem produto válido não é possível avançar/concluir
    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Adicionar produto/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeDisabled();
  });

  it("mantém Continuar bloqueado enquanto as fontes carregam", async () => {
    bundleLoading = true;
    renderWizard();
    await goToSources();
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeDisabled();
  });

  it("com orçamento importável não insere a etapa Produtos", async () => {
    bundleMock = emptyBundle({ quotes: [quoteSource] as any });
    renderWizard();
    await goToSources();

    await waitFor(() => expect(screen.getByText("Orçamento Orlando")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Continuar/i })).not.toBeDisabled();
    expect(screen.queryByText("Produtos")).not.toBeInTheDocument();
  });
});
