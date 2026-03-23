import { Button } from "@/components/ui/button";
import { RefreshCw, Link2, Unlink, Loader2 } from "lucide-react";
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

  return (
    <div className="flex items-center gap-2">
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
      {status.last_sync_at && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Última: {formatDistanceToNow(new Date(status.last_sync_at), { addSuffix: true, locale: ptBR })}
        </span>
      )}
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
