import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clientAreaAuthBody, readClientAreaToken } from "@/lib/clientAreaAccess";
import { DOCUMENT_UNAVAILABLE, type ClientAreaDocument } from "@/lib/clientAreaDocuments";

export type DocumentsStatus = "loading" | "ready" | "error" | "expired";

export interface ClientAreaProfileData {
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  birth_date: string | null;
}

/** Payload da Edge Function mesmo quando o status HTTP indica erro. */
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

interface BaseOptions {
  hostname: string;
  enabled: boolean;
  onExpired?: () => void;
}

/**
 * Central "Meus documentos" — o servidor decide o que pode ser listado
 * (agência do domínio + cliente da sessão + marcação explícita de
 * disponibilidade). O navegador nunca envia agência, cliente ou caminho.
 */
export function useClientAreaDocuments({ hostname, enabled, onExpired }: BaseOptions) {
  const [status, setStatus] = useState<DocumentsStatus>("loading");
  const [documents, setDocuments] = useState<ClientAreaDocument[]>([]);
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
        body: clientAreaAuthBody("documents", hostname, { token }),
      });
      if (cancelled) return;
      const payload = await readPayload(data, error);
      if (cancelled) return;
      if (Array.isArray(payload?.documents)) {
        setDocuments(payload.documents as ClientAreaDocument[]);
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

  return { status, documents, reload };
}

/** Perfil em modo consulta (dados do cadastro mantidos pela agência). */
export function useClientAreaProfile({ hostname, enabled }: BaseOptions) {
  const [profile, setProfile] = useState<ClientAreaProfileData | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const token = readClientAreaToken(hostname);
      if (!token) return;
      const { data, error } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("profile", hostname, { token }),
      });
      const payload = await readPayload(data, error);
      if (!cancelled && payload?.profile) setProfile(payload.profile as ClientAreaProfileData);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname, enabled]);

  return profile;
}

/**
 * Abertura de documentos e da Carteira Digital.
 *
 * - Documento: pedimos uma autorização de leitura de curta duração a cada
 *   clique. A URL nunca é guardada, reaproveitada ou exibida ao cliente.
 * - Carteira: o servidor emite uma autorização de uso único (120s) e a carteira
 *   abre sem pedir a senha da carteira novamente.
 */
export function useClientAreaOpener(hostname: string) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(
    async (action: "document_url" | "wallet_grant", body: Record<string, unknown>) => {
      const token = readClientAreaToken(hostname);
      if (!token) return null;
      const { data, error: fnError } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody(action, hostname, { token, ...body }),
      });
      const payload = await readPayload(data, fnError);
      return typeof payload?.url === "string" ? (payload.url as string) : null;
    },
    [hostname],
  );

  /** Abre em nova aba a partir de um clique do usuário (evita bloqueio de pop-up). */
  const openInNewTab = (url: string) => {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.opener = null;
      win.location.href = url;
      return true;
    }
    window.location.href = url;
    return true;
  };

  const openDocument = useCallback(
    async (doc: Pick<ClientAreaDocument, "id" | "source">) => {
      setError(null);
      setPendingId(doc.id);
      try {
        const url = await invoke("document_url", { document_id: doc.id, source: doc.source });
        if (!url) {
          setError(DOCUMENT_UNAVAILABLE);
          return;
        }
        openInNewTab(url);
      } catch {
        setError(DOCUMENT_UNAVAILABLE);
      } finally {
        setPendingId(null);
      }
    },
    [invoke],
  );

  const openWallet = useCallback(
    async (tripId: string) => {
      setError(null);
      setPendingId(`wallet:${tripId}`);
      try {
        const url = await invoke("wallet_grant", { trip_id: tripId });
        if (!url) {
          setError("Não foi possível abrir a Carteira Digital agora. Fale com a agência.");
          return;
        }
        openInNewTab(url);
      } catch {
        setError("Não foi possível abrir a Carteira Digital agora. Fale com a agência.");
      } finally {
        setPendingId(null);
      }
    },
    [invoke],
  );

  return { pendingId, error, openDocument, openWallet, clearError: () => setError(null) };
}
