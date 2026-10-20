import { useCallback, useRef, useState } from "react";
import { useAgencySiteRequest, type RequestState } from "@/hooks/useAgencySiteRequest";
import { isTechnicalPreviewHost } from "@/lib/agencyDomains";

/** Em hosts técnicos (prévia/editor/local) nenhum envio real acontece: o pedido é simulado. */
export const isDisneyPreviewEnvironment = (hostname = typeof window !== "undefined" ? window.location.hostname : "") =>
  isTechnicalPreviewHost(hostname);

declare global {
  interface Window {
    __disneyPreviewPayloads?: Record<string, unknown>[];
    /** QA: quantos próximos envios simulados devem falhar (testa erro e "Tentar novamente"). */
    __disneyPreviewFailNext?: number;
  }
}

export const DISNEY_PREVIEW_FAIL_MESSAGE = "Prévia: falha simulada. Nada foi enviado.";

export function useDisneyPreviewRequest(agencyHostname: string) {
  const real = useAgencySiteRequest(agencyHostname);
  const preview = isDisneyPreviewEnvironment();
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const submit = useCallback(async (payload: Record<string, unknown>) => {
    if (!preview) return real.submit(payload);
    if (inFlight.current) return { error: true as const, ignored: true as const };
    inFlight.current = true;
    setState("submitting");
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const failNext = (typeof window !== "undefined" && window.__disneyPreviewFailNext) || 0;
      const forceFail = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("__simulate") === "fail";
      if (failNext > 0 || forceFail) {
        if (failNext > 0) window.__disneyPreviewFailNext = failNext - 1;
        setState("error");
        setError(DISNEY_PREVIEW_FAIL_MESSAGE);
        return { error: true as const };
      }
      (window.__disneyPreviewPayloads ??= []).push(payload);
      setState("success");
      return { success: true as const, duplicate: false, simulated: true as const };
    } finally {
      inFlight.current = false;
    }
  }, [preview, real]);

  const reset = useCallback(() => { setState("idle"); setError(null); real.reset(); }, [real]);

  return preview
    ? { state, error, submit, reset, simulated: true }
    : { ...real, submit, reset, simulated: false };
}
