import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ConfirmSaleDialog } from "@/components/reservas/ConfirmSaleDialog";
import { assessTravelFileReadiness } from "@/lib/travelFileConversion";

/**
 * Testes comportamentais do diálogo de confirmação da venda (fluxo unificado
 * V2): chamada real do hook, proteção contra duplo clique e navegação para a
 * operação e a venda criadas.
 */

const rpcMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/lib/agencyAdminNav", () => ({
  useAdminNav: () => ({
    crm: (tab = "funil") => `/gestao-clientes/${tab}`,
    financeiro: "/financeiro",
    reservas: (id?: string) => (id ? `/reservas/${id}` : "/reservas"),
  }),
}));

vi.mock("@/hooks/useUnifiedWorkflow", () => ({
  useConfirmTravelFileSale: () => ({
    mutateAsync: rpcMock,
    isPending: false,
  }),
}));

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

describe("ConfirmSaleDialog — comportamento", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    navigateMock.mockReset();
    rpcMock.mockResolvedValue({
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
    });
  });
  afterEach(cleanup);

  it("exige o canal do aceite antes de chamar o servidor", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /confirmar venda/i }));
    await waitFor(() => expect(rpcMock).not.toHaveBeenCalled());
  });

  it("dois cliques enviam a MESMA chave de idempotência", async () => {
    open();
    fireEvent.click(screen.getByLabelText(/canal do aceite/i));
    fireEvent.click(await screen.findByText("WhatsApp"));

    const button = screen.getByRole("button", { name: /confirmar venda/i });
    fireEvent.click(button);
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    const firstKey = rpcMock.mock.calls[0][0].idempotencyKey;
    expect(firstKey).toBeTruthy();
    expect(rpcMock.mock.calls[0][0].expectedUpdatedAt).toBe(file.updated_at);
    for (const call of rpcMock.mock.calls) {
      expect(call[0].idempotencyKey).toBe(firstKey);
    }
  });

  it("depois de confirmar, os links levam à operação e à venda retornadas", async () => {
    open();
    fireEvent.click(screen.getByLabelText(/canal do aceite/i));
    fireEvent.click(await screen.findByText("WhatsApp"));
    fireEvent.click(screen.getByRole("button", { name: /confirmar venda/i }));

    const openOperation = await screen.findByRole("button", { name: /abrir operação/i });
    fireEvent.click(openOperation);
    expect(navigateMock).toHaveBeenCalledWith("/gestao-clientes/operacoes?operation=op-9");

    fireEvent.click(screen.getByRole("button", { name: /abrir financeiro/i }));
    expect(navigateMock).toHaveBeenCalledWith("/financeiro?tab=vendas&sale=sale-9");
  });
});
