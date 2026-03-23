import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface GoogleCalendarStatus {
  connected: boolean;
  sync_enabled?: boolean;
  last_sync_at?: string | null;
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
        body: { action: "sync" },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Sincronizado! ${data.pushed} enviados, ${data.pulled} importados`);
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
