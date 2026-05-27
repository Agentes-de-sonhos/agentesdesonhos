import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOpportunityHistory } from "@/hooks/useCRM";
import {
  STAGE_LABELS,
  STAGE_BG_COLORS,
  STAGE_BORDER_COLORS,
  STAGE_TEXT_COLORS,
  type OpportunityStage,
} from "@/types/crm";
import { cn } from "@/lib/utils";

interface OpportunityHistoryDialogProps {
  opportunityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StageChip({ stage, neutral }: { stage?: string | null; neutral?: boolean }) {
  if (neutral) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Criação
      </span>
    );
  }
  const key = stage as OpportunityStage;
  const label = STAGE_LABELS[key] || stage || "—";
  const bg = STAGE_BG_COLORS[key] || "bg-slate-50 dark:bg-slate-900/40";
  const border = STAGE_BORDER_COLORS[key] || "border-slate-200 dark:border-slate-700";
  const text = STAGE_TEXT_COLORS[key] || "text-slate-700 dark:text-slate-300";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        bg,
        border,
        text,
      )}
    >
      {label}
    </span>
  );
}

export function OpportunityHistoryDialog({
  opportunityId,
  open,
  onOpenChange,
}: OpportunityHistoryDialogProps) {
  const { history, isLoading } = useOpportunityHistory(opportunityId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico de Movimentações</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 [scrollbar-width:thin]">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-4">Carregando...</p>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma movimentação registrada
            </p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <StageChip stage={entry.from_stage} neutral={!entry.from_stage} />
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <StageChip stage={entry.to_stage} />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
                  {format(new Date(entry.changed_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
                {entry.notes && (
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-2">{entry.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
