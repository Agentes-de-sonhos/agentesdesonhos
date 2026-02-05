import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useOpportunityHistory } from "@/hooks/useCRM";
import { STAGE_LABELS, STAGE_COLORS, type OpportunityStage } from "@/types/crm";
import { cn } from "@/lib/utils";

interface OpportunityHistoryDialogProps {
  opportunityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
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
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.from_stage ? (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-white text-xs",
                          STAGE_COLORS[entry.from_stage as OpportunityStage]
                        )}
                      >
                        {STAGE_LABELS[entry.from_stage as OpportunityStage] || entry.from_stage}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Criação</span>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-white text-xs",
                        STAGE_COLORS[entry.to_stage as OpportunityStage]
                      )}
                    >
                      {STAGE_LABELS[entry.to_stage as OpportunityStage] || entry.to_stage}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(entry.changed_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  {entry.notes && (
                    <p className="text-sm mt-2">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
