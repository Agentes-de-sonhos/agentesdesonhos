import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgencySiteRequest } from "./useAgencySiteRequest";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
beforeEach(() => invoke.mockReset());

describe("confirmação real de solicitações white label", () => {
  for (const data of [null, {}, { success: false }, { duplicate: true }]) {
    it(`recusa resposta sem confirmação ${JSON.stringify(data)}`, async () => {
      invoke.mockResolvedValue({ data, error: null });
      const { result } = renderHook(() => useAgencySiteRequest("destinoscomaju.com.br"));
      await act(async () => { expect(await result.current.submit({})).toEqual({ error: true }); });
      expect(result.current.state).toBe("error");
      expect(result.current.error).toBeTruthy();
    });
  }
  it("captura rejeição e permite retry sem rejeição não tratada", async () => {
    invoke.mockRejectedValueOnce(new Error("Network offline"));
    const { result } = renderHook(() => useAgencySiteRequest("destinoscomaju.com.br"));
    const payload = { lead_name: "Teste fictício" };
    await act(async () => { expect(await result.current.submit(payload)).toEqual({ error: true }); });
    expect(result.current.state).toBe("error");
    invoke.mockResolvedValueOnce({ data: { success: true }, error: null });
    await act(async () => { expect(await result.current.submit(payload)).toEqual({ success: true, duplicate: false }); });
    expect(result.current.state).toBe("success");
    expect(result.current.error).toBeNull();
    expect(invoke.mock.calls[1][1].body.lead_name).toBe("Teste fictício");
  });
  for (const duplicate of [false, true]) {
    it(`confirma success:true com duplicate:${duplicate}`, async () => {
      invoke.mockResolvedValue({ data: { success: true, duplicate, request_id: "test-id" }, error: null });
      const { result } = renderHook(() => useAgencySiteRequest("destinoscomaju.com.br"));
      await act(async () => { expect(await result.current.submit({})).toEqual({ success: true, duplicate }); });
      expect(result.current.state).toBe("success");
    });
  }
  it("preserva mensagem de erro HTTP do servidor", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "HTTP error", context: new Response(JSON.stringify({ error: "Revise o período" })) } });
    const { result } = renderHook(() => useAgencySiteRequest("destinoscomaju.com.br"));
    await act(async () => { await result.current.submit({}); });
    expect(result.current.error).toBe("Revise o período");
    expect(result.current.state).toBe("error");
  });
});