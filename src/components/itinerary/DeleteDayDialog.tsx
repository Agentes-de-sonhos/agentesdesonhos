import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ItineraryDay } from "@/types/itinerary";
import {
  buildDeleteDayPlan,
  previewSlotDate,
  type DeleteDayMode,
} from "@/lib/itineraryDayPlan";
import { parseLocalDate } from "@/lib/dateParsing";

interface DeleteDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: ItineraryDay | null;
  days: ItineraryDay[];
  itineraryStartDate: string;
  itineraryEndDate: string;
  onConfirm: (
    plan: ReturnType<typeof buildDeleteDayPlan>,
    mode: DeleteDayMode,
  ) => Promise<void> | void;
}

/**
 * Modal that confirms the removal of a day and lets the user choose
 * whether to shrink the itinerary or preserve its total length.
 */
export function DeleteDayDialog({
  open,
  onOpenChange,
  day,
  days,
  itineraryStartDate,
  itineraryEndDate,
  onConfirm,
}: DeleteDayDialogProps) {
  const [mode, setMode] = useState<DeleteDayMode>("shorten_period");
  const [saving, setSaving] = useState(false);

  const plan = useMemo(() => {
    if (!day) return null;
    return buildDeleteDayPlan(
      days,
      day.id,
      mode,
      itineraryStartDate,
      itineraryEndDate,
    );
  }, [day, days, mode, itineraryStartDate, itineraryEndDate]);

  const activitiesCount = day?.activities.length ?? 0;

  const handleSubmit = async () => {
    if (!day || !plan) return;
    setSaving(true);
    try {
      await onConfirm(plan, mode);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const previewStart = plan ? parseLocalDate(plan.newStartDate) : null;
  const previewEnd = plan
    ? previewSlotDate(plan, plan.sequence.length - 1)
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
    >
      <DialogContent className="w-[calc(100vw-32px)] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Excluir este dia?
          </DialogTitle>
          <DialogDescription>
            Todas as atividades e informações deste dia serão removidas.
            Essa ação não poderá ser desfeita imediatamente.
          </DialogDescription>
        </DialogHeader>

        {activitiesCount > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Este dia possui <strong>{activitiesCount}</strong>{" "}
              {activitiesCount === 1 ? "atividade" : "atividades"}.
              Todo o conteúdo será excluído permanentemente. Serviços
              vinculados na Carteira Digital e nas viagens permanecerão intactos.
            </p>
          </div>
        )}

        <div className="space-y-3 py-1">
          <Label>Como reorganizar as datas?</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as DeleteDayMode)}
            className="space-y-2"
          >
            <label
              className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 hover:bg-muted/30"
              htmlFor="shorten_period"
            >
              <RadioGroupItem value="shorten_period" id="shorten_period" className="mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Encurtar o período da viagem</p>
                <p className="text-xs text-muted-foreground">
                  O roteiro terá um dia a menos e as datas serão ajustadas.
                </p>
              </div>
            </label>
            <label
              className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 hover:bg-muted/30"
              htmlFor="keep_period"
            >
              <RadioGroupItem value="keep_period" id="keep_period" className="mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Manter o período da viagem</p>
                <p className="text-xs text-muted-foreground">
                  Os dias seguintes avançam uma posição e um dia vazio é
                  criado no final do roteiro.
                </p>
              </div>
            </label>
          </RadioGroup>

          {previewStart && previewEnd && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <p className="text-muted-foreground">Novo período</p>
              <p className="font-medium text-foreground">
                {format(previewStart, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                {" → "}
                {format(previewEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                {" · "}
                {plan!.sequence.length} {plan!.sequence.length === 1 ? "dia" : "dias"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir dia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}