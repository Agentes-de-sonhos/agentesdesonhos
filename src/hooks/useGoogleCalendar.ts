import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isReconnectResponse, type ConnectionState } from "@/lib/googleCalendarConnection";

interface GoogleCalendarStatus {
  connected: boolean;
  sync_enabled?: boolean;
  auto_sync_enabled?: boolean;
  last_sync_at?: string | null;
  sync_in_progress?: boolean;
  last_sync_status?: "idle" | "syncing" | "synced" | "error" | "bootstrap" | "incremental" | null;
  last_sync_error?: string | null;
  last_sync_duration_ms?: number | null;
  connection_state?: ConnectionState | null;
  last_auth_error?: string | null;
  last_auth_error_at?: string | null;
  bootstrap_in_progress?: boolean | null;
  bootstrap_pages_done?: number | null;
  bootstrap_items_done?: number | null;
  incremental_in_progress?: boolean | null;
  incremental_pages_done?: number | null;
  incremental_items_done?: number | null;
}

export interface SyncSkipSample {
  reason: string;
  google_event_id?: string;
  agency_event_id?: string;
  title?: string;
  calendar_id?: string;
  start?: string | null;
  end?: string | null;
  status?: string | null;
  event_type?: string | null;
  recurring_event_id?: string | null;
  all_day?: boolean;
  extended_properties?: Record<string, unknown> | null;
  has_mapping?: boolean;
  mapping_deleted?: boolean;
  google_updated?: string | null;
  last_synced_at?: string | null;
}

export interface SyncReport {
  pushed_created: number;
  pushed_updated: number;
  pushed_skipped: number;
  pulled_created: number;
  pulled_updated: number;
  pulled_skipped: number;
  deleted_google: number;
  deleted_local: number;
  delete_errors: number;
  total_google: number;
  calendar_id: string;
  skip_summary: { push: Record<string, number>; pull: Record<string, number> };
  skip_samples: { push: SyncSkipSample[]; pull: SyncSkipSample[] };
  window: { start: string; end: string };
  duration_ms: number;
  pull_mode?: "bootstrap" | "incremental";
  bootstrap_in_progress?: boolean;
  incremental_in_progress?: boolean;
  pages_this_run?: number;
  items_this_run?: number;
  resume_pending?: boolean;
  deleted_scan_complete?: boolean;
  deleted_batch_size?: number;
  deleted_processed?: number;
  // Block 3: conflicts, read-only skips and phase order.
  conflicts_detected?: number;
  conflicts?: SyncConflictSummary[];
  read_only_skipped?: number;
  delete_skip_reasons?: Record<string, number>;
  phase_order?: string;
}

export interface SyncConflictSummary {
  google_event_id: string | null;
  agency_event_id: string | null;
  conflict_type: string;
  title: string | null;
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GoogleCalendarStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastReport, setLastReport] = useState<SyncReport | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "status" },
      });
      if (!error && data) {
        setStatus(data);
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth");
      if (error) throw error;
      if (data?.url) {
        // Open Google OAuth in a popup
        const popup = window.open(data.url, "google-calendar-auth", "width=500,height=600,scrollbars=yes");
        
        // Poll for popup close
        const interval = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(interval);
            await checkStatus();
            setIsLoading(false);
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error("Connect error:", err);
      toast.error("Erro ao conectar com o Google Calendar");
      setIsLoading(false);
    }
  }, [user?.id, checkStatus]);

  const disconnect = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      setStatus({ connected: false });
      toast.success("Google Calendar desconectado. Seus eventos foram preservados.");
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const sync = useCallback(async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "sync", force: true },
      });
      if (error) {
        // A 401 carries the reconnect signal in the response body.
        const raw = (error as { context?: { text?: () => Promise<string> } })?.context?.text
          ? await (error as { context: { text: () => Promise<string> } }).context.text()
          : "";
        let parsed: unknown = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch { /* ignore */ }
        if (isReconnectResponse(parsed)) {
          toast.error("Reconexão necessária. Conecte novamente o Google Calendar.");
          await checkStatus();
          return;
        }
        throw error;
      }
      if (isReconnectResponse(data)) {
        toast.error("Reconexão necessária. Conecte novamente o Google Calendar.");
        await checkStatus();
      } else if (data?.success && data?.skipped) {
        toast.info(
          data.skipped === "rate-limit"
            ? "Sincronização recente. Aguarde alguns segundos para forçar de novo."
            : data.skipped === "lock"
            ? "Já existe uma sincronização em andamento."
            : `Ignorado: ${data.skipped}`
        );
        await checkStatus();
      } else if (data?.success) {
        const pushErrors = data.push_errors?.length || 0;
        const pullErrors = data.pull_errors?.length || 0;
        const dErrors = data.delete_errors ?? 0;
        const totalErrors = pushErrors + pullErrors + dErrors;
        const pCreated = data.pushed_created ?? 0;
        const pUpdated = data.pushed_updated ?? 0;
        const pSkipped = data.pushed_skipped ?? 0;
        const lCreated = data.pulled_created ?? 0;
        const lUpdated = data.pulled_updated ?? 0;
        const lSkipped = data.pulled_skipped ?? 0;
        const dGoogle = data.deleted_google ?? 0;
        const dLocal = data.deleted_local ?? 0;
        setLastReport({
          pushed_created: pCreated,
          pushed_updated: pUpdated,
          pushed_skipped: pSkipped,
          pulled_created: lCreated,
          pulled_updated: lUpdated,
          pulled_skipped: lSkipped,
          deleted_google: dGoogle,
          deleted_local: dLocal,
          delete_errors: dErrors,
          total_google: data.total_google ?? 0,
          calendar_id: data.calendar_id ?? "primary",
          skip_summary: data.skip_summary ?? { push: {}, pull: {} },
          skip_samples: data.skip_samples ?? { push: [], pull: [] },
          window: data.window ?? { start: "", end: "" },
          duration_ms: data.duration_ms ?? 0,
          pull_mode: data.pull_mode,
          bootstrap_in_progress: !!data.bootstrap_in_progress,
          incremental_in_progress: !!data.incremental_in_progress,
          pages_this_run: data.pages_this_run ?? 0,
          items_this_run: data.items_this_run ?? 0,
          resume_pending: !!data.resume_pending,
          deleted_scan_complete: data.deleted_scan_complete !== false,
          deleted_batch_size: data.deleted_batch_size ?? 0,
          deleted_processed: data.deleted_processed ?? 0,
        });
        const summary =
          `Enviados: ${pCreated} criados, ${pUpdated} atualizados, ${pSkipped} ignorados · ` +
          `Importados: ${lCreated} criados, ${lUpdated} atualizados, ${lSkipped} ignorados · ` +
          `Exclusões: ${dGoogle} no Google, ${dLocal} na Agenda`;
        if (totalErrors > 0) {
          toast.warning(`${summary} · ${totalErrors} erro(s). Veja os logs.`);
          console.error("[calendar-sync] push_errors:", data.push_errors);
          console.error("[calendar-sync] pull_errors:", data.pull_errors);
        } else if (data.bootstrap_in_progress) {
          // Partial bootstrap: report progress, never completion.
          toast.info(
            `Sincronização inicial em andamento · ${data.items_this_run ?? 0} eventos em ${data.pages_this_run ?? 0} páginas nesta rodada. Continua automaticamente.`,
          );
        } else if (data.incremental_in_progress) {
          // Partial incremental walk: resumes from the persisted page token.
          toast.info(
            `Sincronização em andamento · ${data.items_this_run ?? 0} eventos em ${data.pages_this_run ?? 0} páginas nesta rodada. Continua automaticamente.`,
          );
        } else {
          toast.success(`Sincronizado! ${summary}`);
        }
        if (import.meta.env.DEV) {
          console.info("[calendar-sync] skip_summary:", data.skip_summary);
          console.info("[calendar-sync] skip_samples:", data.skip_samples);
        }
        await checkStatus();
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error("Erro na sincronização");
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, checkStatus]);

  return { status, isLoading, isSyncing, lastReport, connect, disconnect, sync, checkStatus };
}
