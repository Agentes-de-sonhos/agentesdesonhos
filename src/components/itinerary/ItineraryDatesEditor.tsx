import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { Loader2, CalendarCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripPeriodField } from "@/components/shared/TripPeriodField";
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
import { parseLocalDate } from "@/lib/dateParsing";
import type { ItineraryDay } from "@/types/itinerary";

export interface ItineraryDatesEditorProps {
  start: string;
  end: string;
  days: ItineraryDay[];
  saving?: boolean;
  onApply: (next: {
    start: string;
    end: string;
    extraDaysStrategy: "delete" | "merge";
  }) => Promise<void> | void;
}

/**
 * Edição das datas do roteiro com rascunho local. O seletor de período
 * precisa de dois cliques (ida e volta) e o estado do roteiro só é gravado
 * quando a agência confirma — sem rascunho o primeiro clique era descartado
 * e a data inicial ficava impossível de alterar. Encurtar o período nunca
 * apaga atividades sem confirmação explícita.
 */
export function ItineraryDatesEditor({ start, end, days, saving, onApply }: ItineraryDatesEditorProps) {
  const [draft, setDraft] = useState({ start, end });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setDraft({ start, end });
  }, [start, end]);

  const dirty = draft.start !== start || draft.end !== end;
  const complete = !!draft.start && !!draft.end;

  const newDayCount = useMemo(() => {
    if (!complete) return 0;
    return differenceInCalendarDays(parseLocalDate(draft.end), parseLocalDate(draft.start)) + 1;
  }, [complete, draft.end, draft.start]);

  const droppedDays = useMemo(() => {
    if (!complete || newDayCount < 1) return [];
    return (days || []).slice(newDayCount);
  }, [complete, days, newDayCount]);

  const droppedActivities = droppedDays.reduce((sum, d) => sum + (d.activities?.length || 0), 0);

  const commit = async (extraDaysStrategy: "delete" | "merge") => {
    await onApply({ start: draft.start, end: draft.end, extraDaysStrategy });
    setConfirmOpen(false);
  };

  const handleApply = async () => {
    if (!complete || newDayCount < 1 || saving) return;
    if (droppedActivities > 0) {
      setConfirmOpen(true);
      return;
    }
    await commit("delete");
  };

  return (
    <div className="space-y-2">
      <TripPeriodField
        id="itinerary-period"
        label=""
        start={draft.start}
        end={draft.end}
        triggerClassName="w-full rounded-xl"
        onChange={({ start: nextStart, end: nextEnd }) => setDraft({ start: nextStart, end: nextEnd })}
      />
      <p className="text-xs text-muted-foreground">
        Clique na nova data de início e depois na de fim. As atividades já criadas acompanham os dias.
      </p>
      {dirty ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleApply} disabled={!complete || saving} className="rounded-lg">
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />}
            Aplicar novas datas
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDraft({ start, end })}
            disabled={saving}
            className="rounded-lg"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Desfazer
          </Button>
          {complete && newDayCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {newDayCount} {newDayCount === 1 ? "dia" : "dias"} no novo período
            </span>
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !saving && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O novo período é mais curto que o roteiro atual</AlertDialogTitle>
            <AlertDialogDescription>
              {droppedDays.length} {droppedDays.length === 1 ? "dia ficaria" : "dias ficariam"} fora das novas datas,
              com {droppedActivities} {droppedActivities === 1 ? "atividade já criada" : "atividades já criadas"}.
              Escolha o que fazer com elas antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void commit("merge")}
            >
              Manter atividades no último dia
            </Button>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void commit("delete");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir os dias extras
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ItineraryDatesEditor;
