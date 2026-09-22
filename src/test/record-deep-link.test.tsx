import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup, act } from "@testing-library/react";

/**
 * Testes COMPORTAMENTAIS do atalho por link direto (?sale= / ?operation=):
 * registro fora da lista aparece e abre, falha transitória preserva o parâmetro
 * e a nova tentativa refaz de fato a consulta, resposta definitiva limpa.
 */

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: any[]) => toastError(...a) } }));

import { useRecordDeepLink } from "@/hooks/useRecordDeepLink";

type Rec = { id: string };

function setup(over: Partial<Parameters<typeof useRecordDeepLink<Rec>>[0]> = {}) {
  const onOpen = vi.fn();
  const onClear = vi.fn();
  const fetchById = vi.fn(async () => ({ data: { id: "x-1" } as Rec, error: null }));
  const props = {
    param: "x-1",
    listReady: true,
    list: [] as Rec[],
    fetchById,
    onOpen,
    onClear,
    messages: { transient: "transitório", exhausted: "esgotado", missing: "inexistente" },
    ...over,
  };
  const hook = renderHook((p: any) => useRecordDeepLink<Rec>(p), { initialProps: props });
  const rerender = (next: Partial<typeof props>) =>
    act(() => { hook.rerender({ ...props, ...next } as any); });
  return { hook, rerender, props, onOpen, onClear, fetchById: props.fetchById as any };
}

/** Promise controlada: resolvemos no momento exato do teste. */
function deferred<V>() {
  let resolve!: (v: V) => void;
  const promise = new Promise<V>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("useRecordDeepLink — atalho por link direto", () => {
  beforeEach(() => toastError.mockReset());
  afterEach(cleanup);

  it("não consulta nada enquanto a lista está carregando/atualizando", () => {
    const { fetchById, onOpen } = setup({ listReady: false });
    expect(fetchById).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("registro já na lista abre sem consulta ao servidor e limpa o parâmetro", () => {
    const { fetchById, onOpen, onClear } = setup({ list: [{ id: "x-1" }] });
    expect(fetchById).not.toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledWith({ id: "x-1" }, true);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("registro fora da lista (outro mês/limite) é buscado, aberto e o parâmetro limpo", async () => {
    const { fetchById, onOpen, onClear } = setup();
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ id: "x-1" }, false));
    expect(fetchById).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("falha transitória mantém o parâmetro e a nova tentativa REFAZ a consulta", async () => {
    const fetchById = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "network" } })
      .mockResolvedValueOnce({ data: { id: "x-1" }, error: null });
    const { onOpen, onClear } = setup({ fetchById });
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(onClear).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();

    const [msg, opts] = toastError.mock.calls[0];
    expect(msg).toBe("transitório");
    await act(async () => { opts.action.onClick(); });
    await waitFor(() => expect(fetchById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ id: "x-1" }, false));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("tentativas são limitadas: na última falha não há mais ação de retry", async () => {
    const fetchById = vi.fn().mockResolvedValue({ data: null, error: { message: "network" } });
    setup({ fetchById, maxAttempts: 2 });
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    await act(async () => { toastError.mock.calls[0][1].action.onClick(); });
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(2));
    expect(toastError.mock.calls[1][0]).toBe("esgotado");
    expect(toastError.mock.calls[1][1]).toBeUndefined();
    expect(fetchById).toHaveBeenCalledTimes(2);
  });

  it("inexistente/inacessível é resposta definitiva: avisa e limpa o parâmetro", async () => {
    const fetchById = vi.fn().mockResolvedValue({ data: null, error: null });
    const { onOpen, onClear } = setup({ fetchById });
    await waitFor(() => expect(onClear).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith("inexistente");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("sem parâmetro não há consulta nem limpeza", () => {
    const { fetchById, onClear } = setup({ param: null });
    expect(fetchById).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });
});

/**
 * Corridas: identidade da lista, oscilação de "carregando", parâmetro trocado,
 * reabertura do mesmo id e reinício das tentativas. Todos com promise
 * controlada + rerender (comportamentais).
 */
describe("useRecordDeepLink — corridas", () => {
  beforeEach(() => toastError.mockReset());
  afterEach(cleanup);

  it("lista mudando durante a consulta não cancela nem suprime a tentativa", async () => {
    const d = deferred<{ data: Rec | null; error: unknown }>();
    const fetchById = vi.fn(() => d.promise);
    const { rerender, onOpen, onClear } = setup({ fetchById });
    expect(fetchById).toHaveBeenCalledTimes(1);

    // Nova identidade de lista (refetch do cache) chega durante a consulta.
    rerender({ list: [{ id: "outro" }] });
    rerender({ list: [{ id: "outro" }, { id: "mais-um" }] });
    expect(fetchById).toHaveBeenCalledTimes(1);

    await act(async () => { d.resolve({ data: { id: "x-1" }, error: null }); });
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ id: "x-1" }, false));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("listReady true→false→true durante a consulta não dispara segunda consulta", async () => {
    const d = deferred<{ data: Rec | null; error: unknown }>();
    const fetchById = vi.fn(() => d.promise);
    const { rerender, onOpen } = setup({ fetchById });
    rerender({ listReady: false });
    rerender({ listReady: true });
    expect(fetchById).toHaveBeenCalledTimes(1);
    await act(async () => { d.resolve({ data: { id: "x-1" }, error: null }); });
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
  });

  it("registro chegando pela lista durante a consulta abre UMA vez", async () => {
    const d = deferred<{ data: Rec | null; error: unknown }>();
    const fetchById = vi.fn(() => d.promise);
    const { rerender, onOpen, onClear } = setup({ fetchById });
    rerender({ list: [{ id: "x-1" }] });
    expect(onOpen).toHaveBeenCalledWith({ id: "x-1" }, true);
    await act(async () => { d.resolve({ data: { id: "x-1" }, error: null }); });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("resposta tardia do parâmetro A não abre nada depois de trocar para B", async () => {
    const dA = deferred<{ data: Rec | null; error: unknown }>();
    const dB = deferred<{ data: Rec | null; error: unknown }>();
    const fetchById = vi.fn((id: string) => (id === "x-1" ? dA.promise : dB.promise));
    const { rerender, onOpen } = setup({ fetchById });
    rerender({ param: "x-2" });
    expect(fetchById).toHaveBeenNthCalledWith(2, "x-2");

    await act(async () => { dA.resolve({ data: { id: "x-1" }, error: null }); });
    expect(onOpen).not.toHaveBeenCalled();

    await act(async () => { dB.resolve({ data: { id: "x-2" }, error: null }); });
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ id: "x-2" }, false));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("limpar e reabrir o MESMO id na mesma montagem volta a funcionar", async () => {
    const fetchById = vi.fn(async () => ({ data: { id: "x-1" } as Rec, error: null }));
    const { rerender, onOpen } = setup({ fetchById });
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    // A URL é limpa (param null) e o mesmo link é aberto de novo.
    rerender({ param: null });
    await act(async () => { rerender({ param: "x-1" }); });
    await waitFor(() => expect(fetchById).toHaveBeenCalledTimes(2));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("novo id começa na tentativa 1: erro do id anterior não consome tentativas", async () => {
    const fetchById = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } })
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { rerender } = setup({ fetchById, maxAttempts: 2 });
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][0]).toBe("transitório");

    await act(async () => { rerender({ param: "x-2" }); });
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(2));
    // Ainda é a primeira tentativa do novo id: retry segue disponível.
    expect(toastError.mock.calls[1][0]).toBe("transitório");
    expect(toastError.mock.calls[1][1]?.action?.label).toBe("Tentar novamente");
  });
});

/**
 * Guarda síncrona de parâmetro + desmontagem (comportamentais).
 */
describe("useRecordDeepLink — desmontagem e janela de troca de parâmetro", () => {
  beforeEach(() => toastError.mockReset());
  afterEach(cleanup);

  it("desmontar antes da resposta não abre, não limpa e não avisa", async () => {
    const d = deferred<{ data: Rec | null; error: unknown }>();
    const fetchById = vi.fn(() => d.promise);
    const { hook, onOpen, onClear } = setup({ fetchById });
    expect(fetchById).toHaveBeenCalledTimes(1);
    hook.unmount();
    await act(async () => { d.resolve({ data: { id: "x-1" }, error: null }); });
    expect(onOpen).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("desmontar antes de uma resposta de erro não mostra aviso", async () => {
    const d = deferred<{ data: Rec | null; error: unknown }>();
    const fetchById = vi.fn(() => d.promise);
    const { hook } = setup({ fetchById });
    hook.unmount();
    await act(async () => { d.resolve({ data: null, error: { message: "boom" } }); });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("resposta de A não atua depois de renderizar B (guarda síncrona do render)", async () => {
    const dA = deferred<{ data: Rec | null; error: unknown }>();
    const never = new Promise<{ data: Rec | null; error: unknown }>(() => {});
    const fetchById = vi.fn((id: string) => (id === "x-1" ? dA.promise : never));
    const { hook, props, onOpen, onClear } = setup({ fetchById });

    // B já renderizado (guarda síncrona atualizada no render); A responde depois.
    act(() => { hook.rerender({ ...props, param: "x-2" } as any); });
    await act(async () => { dA.resolve({ data: { id: "x-1" }, error: null }); });

    expect(onOpen).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});
