import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface GoogleCalendarStatus {
  connected: boolean;
  sync_enabled?: boolean;
  auto_sync_enabled?: boolean;
  last_sync_at?: string | null;
  sync_in_progress?: boolean;
  last_sync_status?: "idle" | "syncing" | "synced" | "error" | null;
  last_sync_error?: string | null;
  last_sync_duration_ms?: number | null;
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GoogleCalendarStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
      toast.success("Google Calendar desconectado");
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
      if (error) throw error;
      if (data?.success && data?.skipped) {
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
        const summary =
          `Enviados: ${pCreated} criados, ${pUpdated} atualizados, ${pSkipped} ignorados · ` +
          `Importados: ${lCreated} criados, ${lUpdated} atualizados, ${lSkipped} ignorados · ` +
          `Exclusões: ${dGoogle} no Google, ${dLocal} na Agenda`;
        if (totalErrors > 0) {
          toast.warning(`${summary} · ${totalErrors} erro(s). Veja os logs.`);
          console.error("[calendar-sync] push_errors:", data.push_errors);
          console.error("[calendar-sync] pull_errors:", data.pull_errors);
        } else {
          toast.success(`Sincronizado! ${summary}`);
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

  return { status, isLoading, isSyncing, connect, disconnect, sync, checkStatus };
}
