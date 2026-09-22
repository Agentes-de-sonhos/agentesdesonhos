import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Testes de comportamento dos hooks do fluxo unificado V2: entitlement
 * (desligado/ligado/carregando/erro), falha estruturada da RPC virando erro de
 * domínio e resolução dos vínculos persistidos (operação e venda).
 */

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

import {
  useUnifiedWorkflowV2,
  useConfirmTravelFileSale,
  useTravelFileWorkflowLinks,
  isConfirmSaleFailure,
} from "@/hooks/useUnifiedWorkflow";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Simula `supabase.from(table).select(...).eq(...).maybeSingle()`. */
function mockLinks(byTable: Record<string, { data: any; error: any }>) {
  fromMock.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => byTable[table] ?? { data: null, error: null } }),
    }),
  }));
}

describe("hooks do fluxo unificado V2", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });
  afterEach(cleanup);

  it("entitlement desligado mantém o fluxo legado (enabled=false)", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const { result } = renderHook(() => useUnifiedWorkflowV2(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  it("entitlement ligado habilita o fluxo unificado", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { result } = renderHook(() => useUnifiedWorkflowV2(), { wrapper });
    await waitFor(() => expect(result.current.enabled).toBe(true));
  });

  it("enquanto carrega, o fluxo permanece desligado", async () => {
    rpcMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useUnifiedWorkflowV2(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.enabled).toBe(false);
  });

  it("erro na consulta do entitlement não liga o fluxo", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useUnifiedWorkflowV2(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  it("falha estruturada da RPC vira erro de domínio, nunca sucesso", async () => {
    rpcMock.mockResolvedValue({
      data: {
        error: "LEGACY_AMBIGUOUS_LINK",
        message: "Mais de uma operação antiga elegível.",
        entity: "operations",
      },
      error: null,
    });
    const { result } = renderHook(() => useConfirmTravelFileSale("file-1"), { wrapper });
    await expect(
      result.current.mutateAsync({
        idempotencyKey: "key-1",
        acceptance: { channel: "whatsapp" },
      }),
    ).rejects.toThrow(/Mais de uma operação antiga elegível/);
  });

  it("sucesso da RPC retorna o resultado tipado", async () => {
    rpcMock.mockResolvedValue({
      data: { file_id: "file-1", operation_id: "op-1", sale_id: "sale-1", created: [], reused: [] },
      error: null,
    });
    const { result } = renderHook(() => useConfirmTravelFileSale("file-1"), { wrapper });
    const data = await result.current.mutateAsync({
      idempotencyKey: "key-1",
      acceptance: { channel: "whatsapp" },
    });
    expect(isConfirmSaleFailure(data)).toBe(false);
    expect(data.operation_id).toBe("op-1");
  });

  it("vínculos persistidos resolvem operação e venda pelo processo", async () => {
    mockLinks({
      operations: { data: { id: "op-7" }, error: null },
      sales: { data: { id: "sale-7" }, error: null },
    });
    const { result } = renderHook(() => useTravelFileWorkflowLinks("file-1", true), { wrapper });
    await waitFor(() => expect(result.current.operationId).toBe("op-7"));
    expect(result.current.saleId).toBe("sale-7");
  });

  it("sem vínculo acessível, os ids ficam nulos para a interface avisar", async () => {
    mockLinks({
      operations: { data: null, error: null },
      sales: { data: null, error: null },
    });
    const { result } = renderHook(() => useTravelFileWorkflowLinks("file-1", true), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.operationId).toBeNull();
    expect(result.current.saleId).toBeNull();
  });

  it("sem entitlement, os vínculos não são consultados", async () => {
    mockLinks({});
    renderHook(() => useTravelFileWorkflowLinks("file-1", false), { wrapper });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
