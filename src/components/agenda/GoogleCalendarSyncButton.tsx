import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Link2, Unlink, Loader2, CheckCircle2, AlertCircle, Info, AlertTriangle, ShieldCheck } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SyncReportDialog } from "./SyncReportDialog";
import {
  bootstrapProgressLabel,
  needsReconnect,
  reconnectMessage,
  legacyScopeNotice,
  timeZoneScopeNotice,
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
  const [showConsent, setShowConsent] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [purgeLocal, setPurgeLocal] = useState(false);

  const handleSync = async () => {
    await sync();
    onSyncComplete?.();
  };

  const handleConnect = async () => {
    setShowConsent(false);
    await connect();
  };

  const handleDisconnect = async () => {
    setShowDisconnect(false);
    await disconnect(purgeLocal);
    setPurgeLocal(false);
  };

  const consentDialog = (
    <Dialog open={showConsent} onOpenChange={setShowConsent}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Conectar seu Google Calendar
          </DialogTitle>
          <DialogDescription>
            Antes de continuar, veja exatamente o que a conexão faz com seus dados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li>
              <strong className="text-foreground">Permissões solicitadas:</strong> eventos da sua agenda
              (ler, criar, editar e excluir) e leitura da configuração do calendário, apenas para
              identificar o fuso horário correto.
            </li>
            <li>
              <strong className="text-foreground">Uso dos dados:</strong> os eventos são usados
              exclusivamente para manter sua Agenda da plataforma e o Google Calendar sincronizados.
            </li>
            <li>
              <strong className="text-foreground">Nunca fazemos:</strong> venda, publicidade,
              compartilhamento com terceiros ou treinamento de modelos de IA com o conteúdo da sua
              agenda.
            </li>
            <li>
              <strong className="text-foreground">Você no controle:</strong> pode desconectar quando
              quiser e escolher apagar as cópias locais dos eventos importados.
            </li>
          </ul>
          <p>
            Detalhes completos na{" "}
            <a href="/politicasdeprivacidade" target="_blank" rel="noreferrer" className="underline text-foreground">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConsent(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConnect} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Continuar para o Google
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const disconnectDialog = (
    <Dialog open={showDisconnect} onOpenChange={setShowDisconnect}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Desconectar o Google Calendar</DialogTitle>
          <DialogDescription>
            Revogamos o acesso no Google e apagamos suas credenciais desta plataforma. Nenhum evento
            é apagado no Google.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
          <Checkbox
            id="purge-local-calendar"
            checked={purgeLocal}
            onCheckedChange={(v) => setPurgeLocal(v === true)}
          />
          <Label htmlFor="purge-local-calendar" className="text-sm font-normal leading-snug">
            Também apagar as cópias locais dos eventos importados do Google desta Agenda.
            <span className="block text-muted-foreground">
              Os eventos criados por você na plataforma são preservados.
            </span>
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDisconnect(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
            Desconectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!status.connected) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConsent(true)}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Conectar Google Calendar
        </Button>
        {consentDialog}
      </>
    );
  }

  const statusKey = resolveStatusKey(status, isSyncing);
  const dotColor = statusDotClass(statusKey);
  const label = statusLabel(statusKey);
  const mustReconnect = needsReconnect(status);
  const bootstrapLabel = bootstrapProgressLabel(status);
  const legacyNotice = legacyScopeNotice(status);
  const timezoneNotice = timeZoneScopeNotice(status);

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
        <Button variant="default" size="sm" onClick={() => setShowConsent(true)} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Reconectar Google Calendar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDisconnect(true)}
          disabled={isLoading}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Unlink className="h-3 w-3" />
          <span className="hidden sm:inline">Desconectar</span>
        </Button>
        {consentDialog}
        {disconnectDialog}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground"
        title={bootstrapLabel || status.last_sync_error || label}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
        <span>{bootstrapLabel ?? label}</span>
        {status.last_sync_at && statusKey !== "syncing" && statusKey !== "bootstrap" && (
          <span>· {formatDistanceToNow(new Date(status.last_sync_at), { addSuffix: true, locale: ptBR })}</span>
        )}
        {statusKey === "error" ? <AlertCircle className="h-3 w-3 text-rose-500" /> : statusKey === "synced" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : null}
      </div>
      {legacyNotice && (
        <button
          type="button"
          onClick={() => setShowConsent(true)}
          title={legacyNotice}
          className="hidden sm:flex items-center gap-1 text-xs text-amber-600 hover:underline"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Reduzir permissões</span>
        </button>
      )}
      {timezoneNotice && (
        <button
          type="button"
          onClick={() => setShowConsent(true)}
          title={timezoneNotice}
          className="hidden sm:flex items-center gap-1 text-xs text-amber-600 hover:underline"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Fuso horário aproximado</span>
        </button>
      )}
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
        onClick={() => setShowDisconnect(true)}
        disabled={isLoading}
        className="gap-1 text-destructive hover:text-destructive"
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
        <span className="hidden sm:inline">Desconectar</span>
      </Button>
      {consentDialog}
      {disconnectDialog}
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
