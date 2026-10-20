import { useCallback, useState } from "react";
import { useAgencySiteRequest, type RequestState } from "@/hooks/useAgencySiteRequest";
import { isTechnicalPreviewHost } from "@/lib/agencyDomains";

/** Em hosts técnicos (prévia/editor/local) nenhum envio real acontece: o pedido é simulado. */
export const isDisneyPreviewEnvironment = (hostname = typeof window !== "undefined" ? window.location.hostname : "") =>
  isTechnicalPreviewHost(hostname);

declare global { interface Window { __disneyPreviewPayloads?: Record<string, unknown>[] } }

export function useDisneyPreviewRequest(agencyHostname: string) {
  const real = useAgencySiteRequest(agencyHostname);
  const preview = isDisneyPreviewEnvironment();
  const [state, setState] = useState<RequestState>("idle");

  const submit = useCallback(async (payload: Record<string, unknown>) => {
    if (!preview) return real.submit(payload);
    setState("submitting");
    await new Promise((r) => setTimeout(r, 300));
    (window.__disneyPreviewPayloads ??= []).push(payload);
    setState("success");
    return { success: true as const, duplicate: false, simulated: true as const };
  }, [preview, real]);

  const reset = useCallback(() => { setState("idle"); real.reset(); }, [real]);

  return preview
    ? { state, error: null as string | null, submit, reset, simulated: true }
    : { ...real, submit, reset, simulated: false };
}
