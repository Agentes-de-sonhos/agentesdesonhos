import { Button } from "@/components/ui/button";
import { RefreshCw, Link2, Unlink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoogleCalendarSyncButtonProps {
  onSyncComplete?: () => void;
}

export function GoogleCalendarSyncButton({ onSyncComplete }: GoogleCalendarSyncButtonProps) {
  const { status, isLoading, isSyncing, connect, disconnect, sync } = useGoogleCalendar();

  const handleSync = async () => {
    await sync();
    onSyncComplete?.();
  };

  if (!status.connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={connect}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        Conectar Google Calendar
      </Button>
    );
  }

  const statusKey = isSyncing || status.sync_in_progress
    ? "syncing"
    : status.last_sync_status || (status.last_sync_at ? "synced" : "idle");
  const dotColor =
    statusKey === "syncing" ? "bg-amber-500 animate-pulse"
    : statusKey === "error" ? "bg-rose-500"
    : statusKey === "synced" ? "bg-emerald-500"
    : "bg-muted-foreground";
  const statusLabel =
    statusKey === "syncing" ? "Sincronizando…"
    : statusKey === "error" ? "Erro de sincronização"
    : statusKey === "synced" ? "Sincronizado"
    : "Aguardando";

  return (
    <div className="flex items-center gap-2">
      <div
        className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground"
        title={status.last_sync_error || statusLabel}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
        <span>{statusLabel}</span>
        {status.last_sync_at && statusKey !== "syncing" && (
          <span>· {formatDistanceToNow(new Date(status.last_sync_at), { addSuffix: true, locale: ptBR })}</span>
        )}
        {statusKey === "error" ? <AlertCircle className="h-3 w-3 text-rose-500" /> : statusKey === "synced" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : null}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="gap-2"
      >
        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sincronizar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={disconnect}
        disabled={isLoading}
        className="gap-1 text-destructive hover:text-destructive"
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
        <span className="hidden sm:inline">Desconectar</span>
      </Button>
    </div>
  );
}
