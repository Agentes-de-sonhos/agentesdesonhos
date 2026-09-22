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
  return { hook, onOpen, onClear, fetchById: props.fetchById as any };
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
