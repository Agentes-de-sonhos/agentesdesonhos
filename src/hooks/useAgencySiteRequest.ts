import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RequestState = "idle" | "submitting" | "success" | "error";

function sessionHash(hostname: string): string {
  const key = `agency-site-session:${hostname}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const fresh = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

function readUtm(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const value = params.get(key);
      if (value) out[key] = value.slice(0, 120);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * Secure submission of a white-label site request.
 * The tenant is derived from the hostname ON THE SERVER — the browser never
 * chooses an agency_id/user_id, and never writes to clients/opportunities.
 */
export function useAgencySiteRequest(hostname: string) {
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState<string | null>(null);
  const openedAt = useRef<number>(Date.now());
  const session = useMemo(() => sessionHash(hostname), [hostname]);

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      setState("submitting");
      setError(null);
      const idempotencyKey = `${session}:${Date.now().toString(36)}`;
      const { data, error: fnError } = await supabase.functions.invoke("submit-agency-site-request", {
        body: {
          ...payload,
          hostname,
          session_id: session,
          idempotency_key: idempotencyKey,
          source_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
          elapsed_ms: Date.now() - openedAt.current,
          utm: readUtm(),
        },
      });

      if (fnError) {
        setState("error");
        setError("Não foi possível enviar sua solicitação agora. Tente novamente em instantes.");
        return { error: true as const };
      }

      const result = (data ?? {}) as { error?: string; success?: boolean; duplicate?: boolean };
      if (result.error) {
        setState("error");
        setError(result.error);
        return { error: true as const };
      }

      setState("success");
      return { success: true as const, duplicate: result.duplicate === true };
    },
    [hostname, session],
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    openedAt.current = Date.now();
  }, []);

  return { state, error, submit, reset };
}
