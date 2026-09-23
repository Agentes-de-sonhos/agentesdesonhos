import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { canonicalOperationServiceType } from "@/lib/operationServiceMap";
import { ManualServiceDialog } from "@/components/reservas/ManualServiceDialog";
import type { TravelFileService } from "@/types/travelFile";

const rpc = vi.fn();
const insertSingle = vi.fn();
const insertSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.select = vi.fn(self);
      chain.eq = vi.fn(self);
      chain.order = vi.fn(self);
      chain.insert = vi.fn((rows: unknown) => {
        insertSpy(rows);
        return { select: () => ({ single: () => insertSingle() }) };
      });
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return chain;
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useOperationServices } from "@/hooks/useOperationServices";

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: {}, error: null });
  insertSingle.mockReset().mockResolvedValue({ data: { id: "os-new" }, error: null });
  insertSpy.mockReset();
});

describe("tipo do serviço", () => {
  it("mantém locação de veículo como car_rental", () => {
    expect(canonicalOperationServiceType("car_rental")).toBe("car_rental");
    expect(canonicalOperationServiceType("locacao")).toBe("car_rental");
    expect(canonicalOperationServiceType("Locação")).toBe("car_rental");
    // E nunca cai em hospedagem por engano.
    expect(canonicalOperationServiceType("locacao_veiculo")).not.toBe("hotel");
  });

  it("salva o serviço com o tipo canônico, não como hospedagem", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const service = {
      id: "fs-1",
      service_type: "locacao",
      product_name: "Locação de Carro",
      supplier_name: "Intelli Vacation Homes",
      status: "booked",
      quantity: 1,
      requested_amount: 7500,
      snapshot: {},
    } as unknown as TravelFileService;

    render(
      <ManualServiceDialog open onOpenChange={() => {}} service={service} onSave={onSave} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Salvar serviço/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      serviceType: "car_rental",
      productName: "Locação de Carro",
    });
  });
});

describe("adicionar serviço em Operações", () => {
  it("materializa o serviço na reserva e no financeiro, uma única vez por serviço", async () => {
    const { result } = renderHook(
      () => useOperationServices({ operationId: "op-1", enabled: true }),
      { wrapper },
    );

    await act(async () => {
      await result.current.addService({ name: "Locação de Carro", service_type: "car_rental", amount: 7500 });
    });

    const materializeCalls = rpc.mock.calls.filter((c) => c[0] === "travel_service_materialize");
    expect(materializeCalls).toHaveLength(1);
    expect(materializeCalls[0][1]).toMatchObject({ _operation_service_id: "os-new" });
    expect(insertSpy.mock.calls[0][0]).toMatchObject({ service_type: "car_rental" });

    // Nova tentativa (retry/duplo clique) reaproveita o mesmo vínculo no banco:
    // a chamada continua sendo uma por serviço criado.
    await act(async () => {
      await result.current.addService({ name: "Locação de Carro", service_type: "car_rental", amount: 7500 });
    });
    expect(rpc.mock.calls.filter((c) => c[0] === "travel_service_materialize")).toHaveLength(2);
    expect(new Set(rpc.mock.calls.map((c) => JSON.stringify(c[1]))).size).toBe(1);
  });
});
