import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ConfirmSaleDialog } from "@/components/reservas/ConfirmSaleDialog";
import { assessTravelFileReadiness } from "@/lib/travelFileConversion";

/**
 * Testes comportamentais do diálogo de confirmação da venda (fluxo unificado
 * V2): chamada real do hook, bloqueio de duplo clique com estado de carregando,
 * tratamento de falha estruturada (LEGACY_AMBIGUOUS_LINK) e navegação para a
 * operação e a venda retornadas.
 */

const rpcMock = vi.fn();
const navigateMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

// jsdom não implementa a API usada pelo menu suspenso do design system.
beforeEach(() => {
  (Element.prototype as any).scrollIntoView = vi.fn();
  (Element.prototype as any).hasPointerCapture = vi.fn();
  (Element.prototype as any).releasePointerCapture = vi.fn();
  (Element.prototype as any).setPointerCapture = vi.fn();
});

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("sonner", () => ({
  toast: { success: (...a: any[]) => toastSuccess(...a), error: (...a: any[]) => toastError(...a) },
}));

vi.mock("@/lib/agencyAdminNav", () => ({
  useAdminNav: () => ({
    crm: (tab = "funil") => `/gestao-clientes/${tab}`,
    financeiro: "/financeiro",
    reservas: (id?: string) => (id ? `/reservas/${id}` : "/reservas"),
  }),
}));

// Hook simulado com estado real de carregando, como o react-query faz.
vi.mock("@/hooks/useUnifiedWorkflow", async () => {
  const React = await import("react");
  const isConfirmSaleFailure = (data: any) => !!data && typeof data.error === "string";
  return {
    isConfirmSaleFailure,
    useConfirmTravelFileSale: () => {
      const [isPending, setPending] = React.useState(false);
      return {
        isPending,
        mutateAsync: async (input: any) => {
          setPending(true);
          try {
            const data = await rpcMock(input);
            if (isConfirmSaleFailure(data)) {
              const err: any = new Error(data.message || "falha");
              err.code = data.error;
              throw err;
            }
            return data;
          } finally {
            setPending(false);
          }
        },
      };
    },
  };
});

const file: any = {
  id: "file-1",
  status: "awaiting_client",
  client_id: "client-1",
  opportunity_id: "opp-1",
  currency: "BRL",
  pricing_mode: "itemized",
  updated_at: "2026-09-22T00:00:00Z",
};

const services: any[] = [
  {
    id: "svc-1",
    file_id: "file-1",
    status: "available",
    is_required: true,
    currency: "BRL",
    requested_amount: 1000,
    sold_amount: 1200,
    service_type: "flight",
    product_name: "Voo GRU-MCO",
    supplier_name: "Latam",
    financial_rule_status: "confirmed",
    commission_type: "percentage",
    commission_percent: 8,
  },
];

function open() {
  const readiness = assessTravelFileReadiness(file, services, {});
  return render(
    <ConfirmSaleDialog
      open
      onOpenChange={() => {}}
      file={file}
      readiness={readiness}
      supplierExceptions={{}}
    />,
  );
}

async function chooseChannel() {
  fireEvent.click(screen.getByLabelText(/canal do aceite/i));
  fireEvent.click(await screen.findByText("WhatsApp"));
}

const successPayload = {
  file_id: "file-1",
  opportunity_id: "opp-1",
  operation_id: "op-9",
  sale_id: "sale-9",
  created: ["operation", "sale"],
  reused: [],
  replayed: false,
  warnings: [],
  total: 1200,
  currency: "BRL",
};

describe("ConfirmSaleDialog — comportamento", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    navigateMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    rpcMock.mockResolvedValue(successPayload);
  });
  afterEach(cleanup);

  it("exige o canal do aceite antes de chamar o servidor", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /confirmar venda/i }));
    await waitFor(() => expect(rpcMock).not.toHaveBeenCalled());
  });

  it("dois cliques rápidos geram UMA única chamada, com a mesma chave", async () => {
    let resolveRpc: (value: unknown) => void = () => {};
    rpcMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRpc = resolve;
        }),
    );
    open();
    await chooseChannel();

    const button = screen.getByRole("button", { name: /confirmar venda/i });
    fireEvent.click(button);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    // Durante o envio o botão fica desabilitado (estado de carregando real).
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(rpcMock).toHaveBeenCalledTimes(1);

    resolveRpc(successPayload);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const firstKey = rpcMock.mock.calls[0][0].idempotencyKey;
    expect(firstKey).toBeTruthy();
    expect(rpcMock.mock.calls[0][0].expectedUpdatedAt).toBe(file.updated_at);
  });

  it("falha estruturada (LEGACY_AMBIGUOUS_LINK) nunca aparece como sucesso", async () => {
    rpcMock.mockResolvedValue({
      error: "LEGACY_AMBIGUOUS_LINK",
      message: "Esta oportunidade tem mais de uma venda antiga elegível.",
      entity: "sales",
      replayed: false,
    });
    open();
    await chooseChannel();
    fireEvent.click(screen.getByRole("button", { name: /confirmar venda/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.queryByText(/venda registrada com sucesso/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /abrir financeiro/i })).toBeNull();
    // O botão continua utilizável para nova tentativa após corrigir o vínculo.
    expect(screen.getByRole("button", { name: /confirmar venda/i })).not.toBeDisabled();
  });

  it("erro do servidor (WORKFLOW_LINK_CONFLICT) mostra mensagem e não confirma", async () => {
    rpcMock.mockRejectedValue(
      new Error("WORKFLOW_LINK_CONFLICT: Esta oportunidade já está vinculada a outro processo."),
    );
    open();
    await chooseChannel();
    fireEvent.click(screen.getByRole("button", { name: /confirmar venda/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0][0])).toMatch(/vinculada a outro processo/i);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("depois de confirmar, os links levam à operação e à venda retornadas", async () => {
    open();
    await chooseChannel();
    fireEvent.click(screen.getByRole("button", { name: /confirmar venda/i }));

    const openOperation = await screen.findByRole("button", { name: /abrir operação/i });
    fireEvent.click(openOperation);
    expect(navigateMock).toHaveBeenCalledWith("/gestao-clientes/operacoes?operation=op-9");

    fireEvent.click(screen.getByRole("button", { name: /abrir financeiro/i }));
    expect(navigateMock).toHaveBeenCalledWith("/financeiro?tab=vendas&sale=sale-9");
  });
});
