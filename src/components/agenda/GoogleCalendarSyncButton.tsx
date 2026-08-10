import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Link2, Unlink, Loader2, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SyncReportDialog } from "./SyncReportDialog";
import {
  needsReconnect,
  reconnectMessage,
  resolveStatusKey,
  statusDotClass,
  statusLabel,
} from "@/lib/googleCalendarConnection";

interface GoogleCalendarSyncButtonProps {
  onSyncComplete?: () => void;
}

export function GoogleCalendarSyncButton({ onSyncComplete }: GoogleCalendarSyncButtonProps) {
  const { status, isLoading, isSyncing, lastReport, connect, disconnect, sync } = useGoogleCalendar();
  const [showReport, setShowReport] = useState(false);

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

  const statusKey = resolveStatusKey(status, isSyncing);
  const dotColor = statusDotClass(statusKey);
  const label = statusLabel(statusKey);
  const mustReconnect = needsReconnect(status);

  // Re-consent required: the connection is kept, but only reconnecting fixes it.
  if (mustReconnect) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs text-amber-600"
          title={reconnectMessage(status)}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <Button variant="default" size="sm" onClick={connect} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Reconectar Google Calendar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          disabled={isLoading}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Unlink className="h-3 w-3" />
          <span className="hidden sm:inline">Desconectar</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground"
        title={status.last_sync_error || label}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
        <span>{label}</span>
        {status.last_sync_at && statusKey !== "syncing" && (
          <span>· {formatDistanceToNow(new Date(status.last_sync_at), { addSuffix: true, locale: ptBR })}</span>
        )}
        {statusKey === "error" ? <AlertCircle className="h-3 w-3 text-rose-500" /> : statusKey === "synced" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : null}
      </div>
      {lastReport && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReport(true)}
          className="gap-1"
          title="Ver detalhes da última sincronização"
        >
          <Info className="h-4 w-4" />
          <span className="hidden md:inline">Detalhes</span>
        </Button>
      )}
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
      {lastReport && (
        <SyncReportDialog
          open={showReport}
          onOpenChange={setShowReport}
          report={lastReport}
        />
      )}
    </div>
  );
}
