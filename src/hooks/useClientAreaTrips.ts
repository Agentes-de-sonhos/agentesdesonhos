import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clientAreaAuthBody, readClientAreaToken } from "@/lib/clientAreaAccess";
import type { ClientAreaTrip } from "@/lib/clientAreaTrips";

export type TripsStatus = "loading" | "ready" | "error" | "expired";

/**
 * Extrai o payload JSON mesmo quando a Edge Function responde com status de
 * erro (supabase-js entrega o corpo dentro de `error.context`).
 */
async function readPayload(data: unknown, error: unknown): Promise<any> {
  if (data) return data as any;
  const ctx = (error as any)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      return await ctx.json();
    } catch {
      return null;
    }
  }
  return null;
}

const isExpired = (message?: string | null) =>
  !!message && /sess(ã|a)o|bloquead|expirad/i.test(message);

interface Options {
  hostname: string;
  enabled: boolean;
  /** Token rotacionado devolvido pelo servidor. */
  onToken?: (token: string) => void;
  /** Sessão recusada pelo servidor (expirada, revogada ou bloqueada). */
  onExpired?: () => void;
}

/**
 * Minhas viagens — única porta de entrada dos dados reais no cliente.
 * A resolução de agência e cliente acontece no servidor a partir da sessão e do
 * hostname; nada de identificadores escolhidos pelo navegador.
 */
export function useClientAreaTrips({ hostname, enabled, onToken, onExpired }: Options) {
  const [status, setStatus] = useState<TripsStatus>("loading");
  const [trips, setTrips] = useState<ClientAreaTrip[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      const token = readClientAreaToken(hostname);
      if (!token) {
        if (!cancelled) setStatus("expired");
        return;
      }
      const { data, error } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("trips", hostname, { token }),
      });
      if (cancelled) return;
      const payload = await readPayload(data, error);
      if (cancelled) return;
      if (Array.isArray(payload?.trips)) {
        if (payload.token) onToken?.(payload.token);
        setTrips(payload.trips as ClientAreaTrip[]);
        setStatus("ready");
        return;
      }
      if (isExpired(payload?.error)) {
        setStatus("expired");
        onExpired?.();
        return;
      }
      setStatus("error");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname, enabled, reloadKey]);

  return { status, trips, reload };
}

/** Detalhe de uma viagem — a posse é revalidada no servidor a cada chamada. */
export function useClientAreaTrip({
  hostname,
  tripId,
  enabled,
  onExpired,
}: {
  hostname: string;
  tripId: string | null;
  enabled: boolean;
  onExpired?: () => void;
}) {
  const [status, setStatus] = useState<TripsStatus | "notfound">("loading");
  const [trip, setTrip] = useState<ClientAreaTrip | null>(null);

  useEffect(() => {
    if (!enabled || !tripId) return;
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      const token = readClientAreaToken(hostname);
      if (!token) {
        if (!cancelled) setStatus("expired");
        return;
      }
      const { data, error } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("trip", hostname, { token, trip_id: tripId }),
      });
      if (cancelled) return;
      const payload = await readPayload(data, error);
      if (cancelled) return;
      if (payload && "trip" in payload) {
        if (payload.trip) {
          setTrip(payload.trip as ClientAreaTrip);
          setStatus("ready");
        } else {
          // Inexistente ou de outra pessoa: mesma resposta genérica.
          setStatus("notfound");
        }
        return;
      }
      if (isExpired(payload?.error)) {
        setStatus("expired");
        onExpired?.();
        return;
      }
      setStatus("error");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname, tripId, enabled]);

  return { status, trip };
}
