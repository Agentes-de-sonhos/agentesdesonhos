import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PipelineStage } from "@/types/crm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stage: PipelineStage | null;
  allStages: PipelineStage[];
  opportunitiesCount: number;
  onConfirm: (moveToStageId?: string) => Promise<void> | void;
}

export function DeleteStageDialog({
  open,
  onOpenChange,
  stage,
  allStages,
  opportunitiesCount,
  onConfirm,
}: Props) {
  const isOnly = allStages.length <= 1;
  const candidates = allStages.filter((s) => s.id !== stage?.id);
  const [moveTo, setMoveTo] = useState<string>("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (open && candidates.length > 0) {
      setMoveTo(candidates[0].id);
    }
  }, [open, stage?.id]);

  if (!stage) return null;

  const needsMove = opportunitiesCount > 0;

  const handleConfirm = async () => {
    setWorking(true);
    try {
      await onConfirm(needsMove ? moveTo : undefined);
      onOpenChange(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir coluna "{stage.name}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isOnly
              ? "Esta é a única coluna do funil. Crie outra coluna antes de excluir esta."
              : needsMove
              ? "Esta coluna possui oportunidades. Escolha outra coluna para mover esses cards antes de excluir."
              : "Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isOnly && needsMove && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Mover {opportunitiesCount} card(s) para:</label>
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna de destino" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isOnly || working || (needsMove && !moveTo)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {working ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}