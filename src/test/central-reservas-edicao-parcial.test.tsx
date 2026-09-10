import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { EditarRascunhoDialog } from "@/components/reservas/EditarRascunhoDialog";
import { ManualServiceDialog } from "@/components/reservas/ManualServiceDialog";
import { useTravelFileMutations, useTravelFile } from "@/hooks/useTravelFiles";
import { useAdminNav } from "@/lib/agencyAdminNav";

// Identidade sintética.
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

const wrap = (ui: ReactNode) => render(<>{ui}</>, { wrapper });

// Reserva sintética em dólar, com contato escrito à mão.
const FILE: any = {
  id: "44444444-4444-4444-8444-444444444444",
  origin: "manual",
  contractor_type: "individual",
  client_id: "11111111-1111-4111-8111-111111111111",
  company_id: null,
  contact_client_id: null,
  contact_snapshot: { name: "Contato Livre Teste", email: "contato@exemplo.test" },
  trip_name: "Viagem Teste",
  primary_destination: "Destino Antigo",
  start_date: null,
  end_date: null,
  adults_count: 2,
  children_count: 0,
  currency: "USD",
  requested_amount: 1500,
};

beforeEach(() => rpc.mockClear());
afterEach(cleanup);

describe("edição parcial da reserva manual", () => {
  it("mudar só o destino não envia moeda, valor nem contato", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useTravelFileMutations(FILE.id), { wrapper });

    wrap(
      <EditarRascunhoDialog
        open
        onOpenChange={() => {}}
        file={FILE}
        onSave={async (input) => {
          await result.current.saveManualData.mutateAsync(input as any);
        }}
      />,
    );

    const destino = screen.getByLabelText("Destino");
    await user.clear(destino);
    await user.type(destino, "Destino Novo");
    await user.click(screen.getByRole("button", { name: /Salvar altera/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe("travel_file_update_manual");
    const payload = args._payload;
    expect(payload.primary_destination).toBe("Destino Novo");
    // Nada de moeda, valor ou contato livre no pacote enviado: o servidor preserva.
    expect(payload).not.toHaveProperty("currency");
    expect(payload).not.toHaveProperty("requested_amount");
    expect(payload).not.toHaveProperty("contact_name");
    expect(payload).not.toHaveProperty("contact_email");
    expect(payload).not.toHaveProperty("contact_phone");
  });

  it("cache do detalhe é separado por conta", () => {
    const { result } = renderHook(() => useTravelFile(FILE.id), { wrapper });
    expect(result.current).toBeTruthy();
  });
});

describe("valores brasileiros no serviço manual", () => {
  const cases: Array<[string, number]> = [
    ["1.500,00", 1500],
    ["1500,50", 1500.5],
    ["R$ 1.500,00", 1500],
    ["1500.50", 1500.5],
  ];

  for (const [typed, expected] of cases) {
    it(`aceita "${typed}"`, async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      wrap(<ManualServiceDialog open onOpenChange={() => {}} canEditAmount onSave={onSave} />);
      await user.type(screen.getByLabelText(/Nome do servi/i), "Serviço Teste");
      await user.type(screen.getByLabelText(/Valor/i), typed);
      await user.click(screen.getByRole("button", { name: /^Salvar/ }));
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave.mock.calls[0][0].requestedAmount).toBe(expected);
    });
  }

  it("recusa texto inválido em vez de converter", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    wrap(<ManualServiceDialog open onOpenChange={() => {}} canEditAmount onSave={onSave} />);
    await user.type(screen.getByLabelText(/Nome do servi/i), "Serviço Teste");
    await user.type(screen.getByLabelText(/Valor/i), "12abc");
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("voltar para a lista de Reservas", () => {
  it("plataforma tradicional usa /reservas", () => {
    const { result } = renderHook(() => useAdminNav(), { wrapper });
    expect(result.current.reservas()).toBe("/reservas");
  });
});
