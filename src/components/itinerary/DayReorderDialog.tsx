import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ItineraryDay } from "@/types/itinerary";
import { parseLocalDate, formatItineraryDayHeader } from "@/lib/dateParsing";

interface DayReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  days: ItineraryDay[];
  onSave: (orderedDayIds: string[]) => Promise<void> | void;
}

function SortableDayRow({
  day,
  index,
  count,
  onMoveUp,
  onMoveDown,
}: {
  day: ItineraryDay;
  index: number;
  count: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id! });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const total = day.activities.length;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-3 will-change-transform",
        isDragging && "opacity-70 shadow-lg ring-2 ring-primary/40"
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...(listeners as React.DOMAttributes<HTMLButtonElement>)}
        type="button"
        aria-label={`Arrastar Dia ${index + 1}`}
        className="touch-none cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          Dia {index + 1} — {formatItineraryDayHeader(parseLocalDate(day.date))}
        </div>
        <div className="text-xs text-muted-foreground">
          {total} {total === 1 ? "atividade" : "atividades"}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Mover para cima"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onMoveDown}
          disabled={index === count - 1}
          aria-label="Mover para baixo"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DayReorderDialog({
  open,
  onOpenChange,
  days,
  onSave,
}: DayReorderDialogProps) {
  const initialIds = days.map((d) => d.id!).filter(Boolean);
  const [order, setOrder] = useState<string[]>(initialIds);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (open) setOrder(days.map((d) => d.id!).filter(Boolean));
  }, [open, days]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byId = new Map(days.map((d) => [d.id!, d]));
  const isDirty =
    order.length !== initialIds.length ||
    order.some((id, i) => id !== initialIds[i]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    setOrder(arrayMove(order, oldIndex, newIndex));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder(arrayMove(order, index, target));
  };

  const attemptClose = () => {
    if (saving) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(order);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) attemptClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent className="w-[calc(100vw-32px)] sm:w-[calc(100vw-48px)] max-w-lg max-h-[calc(100vh-32px)] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Reordenar dias</DialogTitle>
            <DialogDescription>
              Arraste pelos handles para reorganizar. As datas serão recalculadas
              conforme a nova posição.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {order.map((id, index) => {
                    const day = byId.get(id);
                    if (!day) return null;
                    return (
                      <SortableDayRow
                        key={id}
                        day={day}
                        index={index}
                        count={order.length}
                        onMoveUp={() => move(index, -1)}
                        onMoveDown={() => move(index, 1)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={attemptClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || saving}>
              {saving ? "Salvando..." : "Salvar nova ordem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações na ordem dos dias?</AlertDialogTitle>
            <AlertDialogDescription>
              As mudanças ainda não foram salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar organizando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onOpenChange(false);
              }}
            >
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}