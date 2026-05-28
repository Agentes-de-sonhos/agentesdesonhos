import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOperationTimeline } from "@/hooks/useOperations";
import { getStageMeta, type OperationStage } from "@/types/operations";

function StageChip({ stage }: { stage: OperationStage }) {
  const meta = getStageMeta(stage);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.border} ${meta.text}`}
    >
      {meta.label}
    </span>
  );
}

interface Props {
  operationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperationHistoryDialog({ operationId, open, onOpenChange }: Props) {
  const { events } = useOperationTimeline(operationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico da operação
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum evento registrado ainda.
            </p>
          )}
          {events.map((ev) => {
            const isStageChange = ev.event_type === "stage_changed";
            const isCreated = ev.event_type === "operation_created";
            const from = (ev.metadata as any)?.from as OperationStage | undefined;
            const to = (ev.metadata as any)?.to as OperationStage | undefined;
            const label =
              isCreated ? "Operação criada"
              : isStageChange ? "Etapa alterada"
              : ev.event_type === "manual_note" ? "Anotação"
              : ev.event_type;
            return (
              <div
                key={ev.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {label}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {format(new Date(ev.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {isStageChange && to && (
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {from ? (
                      <StageChip stage={from} />
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Criação
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <StageChip stage={to} />
                  </div>
                )}
                {ev.description && (
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-2">{ev.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}