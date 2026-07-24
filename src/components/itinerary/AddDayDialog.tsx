import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, CalendarPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ItineraryDay } from "@/types/itinerary";
import {
  buildAddDayPlan,
  computeAddPreviewDate,
  type AddDayPosition,
} from "@/lib/itineraryDayPlan";

interface AddDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  days: ItineraryDay[];
  itineraryStartDate: string;
  onConfirm: (
    plan: ReturnType<typeof buildAddDayPlan>,
  ) => Promise<void> | void;
}

type PositionValue = string; // "end" | "before:<id>" | "after:<id>"

function encodePosition(pos: AddDayPosition): PositionValue {
  if (pos.kind === "end") return "end";
  return `${pos.kind}:${pos.dayId}`;
}

function decodePosition(value: PositionValue): AddDayPosition {
  if (value === "end") return { kind: "end" };
  const [kind, dayId] = value.split(":");
  return { kind: kind as "before" | "after", dayId };
}

/**
 * Modal to insert a new empty day at a chosen position. The preview
 * date is computed locally so the user sees the impact before saving.
 */
export function AddDayDialog({
  open,
  onOpenChange,
  days,
  itineraryStartDate,
  onConfirm,
}: AddDayDialogProps) {
  const defaultValue: PositionValue = "end";
  const [value, setValue] = useState<PositionValue>(defaultValue);
  const [saving, setSaving] = useState(false);

  const position = decodePosition(value);
  const previewDate = useMemo(
    () => computeAddPreviewDate(days, position, itineraryStartDate),
    [days, position, itineraryStartDate],
  );

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const plan = buildAddDayPlan(days, position, itineraryStartDate);
      await onConfirm(plan);
      onOpenChange(false);
      setValue(defaultValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
    >
      <DialogContent className="w-[calc(100vw-32px)] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            Adicionar novo dia
          </DialogTitle>
          <DialogDescription>
            Escolha onde o novo dia será inserido. As datas dos demais
            dias e o período total da viagem serão atualizados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Posição</Label>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="end">No final do roteiro</SelectItem>
                {days.map((d) => (
                  <SelectItem key={`before:${d.id}`} value={`before:${d.id}`}>
                    Antes do Dia {d.dayNumber}
                  </SelectItem>
                ))}
                {days.map((d) => (
                  <SelectItem key={`after:${d.id}`} value={`after:${d.id}`}>
                    Depois do Dia {d.dayNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Data prevista</p>
            <p className="text-sm font-medium text-foreground">
              {format(previewDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar dia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}