import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isWithinOfficeHours } from "@/lib/officeHours";
import { officeHoursOf, timezoneOf, type PublicLeadForm } from "@/lib/leadFormConfig";
import { useServerClock } from "@/hooks/useServerClock";

function sessionHash(token: string): string {
  const key = `lead-form-session:${token}`;
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
 * Loads the public configuration of a conversational lead form and exposes a
 * secure submit that goes through the server (never a direct table write).
 */
export function usePublicLeadForm(token: string | undefined) {
  const [config, setConfig] = useState<PublicLeadForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const openedAt = useRef<number>(Date.now());
  const session = useMemo(() => (token ? sessionHash(token) : ""), [token]);
  const idempotencyKey = useMemo(() => `${session}:${Date.now().toString(36)}`, [session]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setLoading(false);
        setLoadError("Formulário não encontrado.");
        return;
      }
      const { data, error } = await supabase.rpc("get_public_lead_form", { p_token: token });
      if (cancelled) return;
      const payload = (data ?? null) as (PublicLeadForm & { error?: string }) | null;
      if (error || !payload || payload.error) {
        setLoadError(payload?.error ?? "Formulário não encontrado.");
        setLoading(false);
        return;
      }
      setConfig(payload);
      setLoading(false);
      // Fire-and-forget view metric (deduped per session/day on the server).
      void supabase.rpc("track_lead_form_view", { p_token: token, p_session_hash: session });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, session]);

  const referenceNow = useServerClock(config?.server_now);

  const isOpen = useMemo(() => {
    if (!config) return false;
    return isWithinOfficeHours(officeHoursOf(config.office_hours), timezoneOf(config.timezone), referenceNow);
  }, [config, referenceNow]);

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!token) return { error: "Formulário não encontrado." };
      const { data, error } = await supabase.functions.invoke("submit-lead-form", {
        body: {
          ...payload,
          token,
          session_id: session,
          idempotency_key: idempotencyKey,
          source_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
          elapsed_ms: Date.now() - openedAt.current,
          utm: readUtm(),
        },
      });
      if (error) {
        return { error: "Não foi possível enviar seus dados agora. Tente novamente em instantes." };
      }
      const result = (data ?? {}) as { error?: string; success?: boolean; duplicate?: boolean };
      if (result.error) return { error: result.error };
      return { success: true, duplicate: result.duplicate === true };
    },
    [token, session, idempotencyKey],
  );

  return { config, loading, loadError, isOpen, referenceNow, submit };
}
