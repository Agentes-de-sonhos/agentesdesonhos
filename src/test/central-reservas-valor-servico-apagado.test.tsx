import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ManualServiceDialog } from "@/components/reservas/ManualServiceDialog";
import { useTravelFileMutations } from "@/hooks/useTravelFiles";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "99999999-9999-4999-8999-999999999999" } }),
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

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const SERVICE: any = {
  id: "55555555-5555-4555-8555-555555555555",
  file_id: "44444444-4444-4444-8444-444444444444",
  service_type: "hotel",
  product_name: "Hotel Teste",
  supplier_name: null,
  destination: "Lisboa",
  start_date: null,
  end_date: null,
  quantity: 1,
  currency: "BRL",
  requested_amount: 1500,
  status: "requested",
  snapshot: { notes: "Nota anterior" },
};

beforeEach(() => rpc.mockClear());
afterEach(cleanup);

function renderDialog(canEditAmount: boolean, saveFn: (input: any) => Promise<void>) {
  return render(
    <ManualServiceDialog
      open
      onOpenChange={() => {}}
      service={SERVICE}
      canEditAmount={canEditAmount}
      onSave={saveFn}
    />,
    { wrapper },
  );
}

describe("valor do serviço manual apagado", () => {
  it("apagar o valor existente envia o campo (0) e não preserva o preço antigo", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useTravelFileMutations(SERVICE.file_id), { wrapper });

    renderDialog(true, async (input) => {
      await result.current.saveManualService.mutateAsync(input);
    });

    await user.clear(screen.getByLabelText(/Valor/i));
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    const payload = rpc.mock.calls[0][1]._payload;
    expect(payload).toHaveProperty("requested_amount");
    expect(payload.requested_amount).toBe(0);
    // Nome, datas e observações continuam sendo enviados normalmente.
    expect(payload.product_name).toBe("Hotel Teste");
    expect(payload.notes).toBe("Nota anterior");
  });

  it("valor zero digitado é enviado como 0", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderDialog(true, onSave);

    const campo = screen.getByLabelText(/Valor/i);
    await user.clear(campo);
    await user.type(campo, "0");
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].requestedAmount).toBe(0);
  });

  it("sem permissão financeira o valor não é enviado", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useTravelFileMutations(SERVICE.file_id), { wrapper });

    renderDialog(false, async (input) => {
      await result.current.saveManualService.mutateAsync(input);
    });

    expect(screen.queryByLabelText(/Valor/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc.mock.calls[0][1]._payload).not.toHaveProperty("requested_amount");
  });

  it("alteração normal do valor continua funcionando", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderDialog(true, onSave);

    const campo = screen.getByLabelText(/Valor/i);
    await user.clear(campo);
    await user.type(campo, "2.300,50");
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].requestedAmount).toBe(2300.5);
  });
});

describe("campo de valor omitido pelo chamador", () => {
  it("não envia requested_amount, deixando o servidor preservar o valor", async () => {
    const { result } = renderHook(() => useTravelFileMutations(SERVICE.file_id), { wrapper });

    await result.current.saveManualService.mutateAsync({
      serviceId: SERVICE.id,
      serviceType: "hotel",
      productName: "Hotel Teste",
    } as any);

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc.mock.calls[0][1]._payload).not.toHaveProperty("requested_amount");
  });
});
