import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { SyncReport, SyncSkipSample } from "@/hooks/useGoogleCalendar";
import { useUserRole } from "@/hooks/useUserRole";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: SyncReport;
}

const REASON_LABELS: Record<string, string> = {
  // push
  mapping_soft_deleted: "Já sincronizado e removido no Google",
  duplicate_local_signature: "Duplicado de um evento já mapeado",
  unchanged_since_last_sync: "Já sincronizado sem alterações",
  google_created_without_id: "Google não retornou ID válido",
  // pull
  created_during_current_push: "Criado pela plataforma nesta sincronização",
  unsupported_event_type: "Tipo especial do Google não suportado (aniversário, fora do escritório, etc.)",
  cancelled_event: "Evento cancelado no Google",
  missing_start_date: "Sem data de início",
  mapping_tombstoned: "Excluído anteriormente e mantido como removido",
  already_synced_unchanged: "Já sincronizado sem alterações",
  local_reference_missing: "Mapeamento inconsistente — será reimportado na próxima sincronização",
};

function ReasonList({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (total === 0) return <p className="text-xs text-muted-foreground">Nenhum item ignorado.</p>;
  if (entries.length === 0)
    return (
      <p className="text-xs text-muted-foreground">
        {total} item(ns) ignorado(s) sem motivo identificável.
      </p>
    );
  return (
    <ul className="space-y-1.5">
      {entries.map(([code, n]) => (
        <li key={code} className="flex items-start gap-2 text-sm">
          <Badge variant="secondary" className="min-w-[2rem] justify-center">{n}</Badge>
          <span className="text-foreground/80">{REASON_LABELS[code] || code}</span>
        </li>
      ))}
    </ul>
  );
}

function SampleTable({ samples }: { samples: SyncSkipSample[] }) {
  if (samples.length === 0) return null;
  return (
    <div className="mt-3 rounded-md border bg-muted/30">
      <ScrollArea className="max-h-64">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/70">
            <tr className="text-left">
              <th className="p-2">Motivo</th>
              <th className="p-2">Título</th>
              <th className="p-2">Início</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Google ID</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 whitespace-nowrap">{s.reason}</td>
                <td className="p-2">{s.title || <em className="text-muted-foreground">sem título</em>}</td>
                <td className="p-2 whitespace-nowrap">{s.start ?? "—"}{s.all_day ? " (dia inteiro)" : ""}</td>
                <td className="p-2 whitespace-nowrap">{s.event_type ?? "default"}{s.status && s.status !== "confirmed" ? ` · ${s.status}` : ""}</td>
                <td className="p-2 font-mono text-[10px]">{s.google_event_id ?? s.agency_event_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

export function SyncReportDialog({ open, onOpenChange, report }: Props) {
  const { isAdmin } = useUserRole();
  const showSamples = isAdmin || import.meta.env.DEV;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da última sincronização</DialogTitle>
          <DialogDescription>
            Calendário <code className="text-xs">{report.calendar_id}</code> · janela {report.window.start} → {report.window.end} · {report.duration_ms}ms
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold">
              Enviados para o Google ({report.pushed_created + report.pushed_updated} · {report.pushed_skipped} ignorados)
            </h3>
            <ReasonList counts={report.skip_summary.push} total={report.pushed_skipped} />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">
              Importados do Google ({report.pulled_created + report.pulled_updated} · {report.pulled_skipped} ignorados de {report.total_google})
            </h3>
            <ReasonList counts={report.skip_summary.pull} total={report.pulled_skipped} />
          </section>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          A sincronização importa compromissos e eventos do Google Calendar. Tarefas do Google Tasks ainda não são importadas.
        </p>

        {showSamples && (report.skip_samples.push.length > 0 || report.skip_samples.pull.length > 0) && (
          <section className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Detalhes técnicos (admin/dev)</h3>
            {report.skip_samples.pull.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Amostra de ignorados no Google → Agenda</p>
                <SampleTable samples={report.skip_samples.pull} />
              </>
            )}
            {report.skip_samples.push.length > 0 && (
              <>
                <p className="mt-3 text-xs text-muted-foreground">Amostra de ignorados na Agenda → Google</p>
                <SampleTable samples={report.skip_samples.push} />
              </>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}