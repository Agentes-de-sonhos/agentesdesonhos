import { useEffect, useState } from "react";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarPlus, GripVertical, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddDayDialog } from "./AddDayDialog";
import { DeleteDayDialog } from "./DeleteDayDialog";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { formatItineraryDayHeader, parseLocalDate } from "@/lib/dateParsing";
import type { ItineraryDay } from "@/types/itinerary";
import type { buildAddDayPlan, buildDeleteDayPlan, DeleteDayMode } from "@/lib/itineraryDayPlan";

function DayRow({ day, onDelete }: { day: ItineraryDay; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: day.id ?? "" });
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${isDragging ? "opacity-60 shadow-lg" : ""}`}>
    <Button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 touch-none cursor-grab" aria-label={`Arrastar Dia ${day.dayNumber}`}><GripVertical className="h-4 w-4" /></Button>
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Dia {day.dayNumber}</p><p className="truncate text-xs text-muted-foreground">{formatItineraryDayHeader(parseLocalDate(day.date))} · {day.activities.length} {day.activities.length === 1 ? "atividade" : "atividades"}</p></div>
    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={onDelete} disabled={false} aria-label={`Excluir Dia ${day.dayNumber}`}><Trash2 className="h-4 w-4" /></Button>
  </div>;
}

interface Props {
  days: ItineraryDay[];
  startDate: string;
  endDate: string;
  onReorder: (ids: string[]) => Promise<void> | void;
  onAdd: (plan: ReturnType<typeof buildAddDayPlan>) => Promise<void> | void;
  onDelete: (plan: ReturnType<typeof buildDeleteDayPlan>, mode: DeleteDayMode, day: ItineraryDay) => Promise<void> | void;
}
export function ItineraryDaysOrganizer({ days, startDate, endDate, onReorder, onAdd, onDelete }: Props) {
  const [order, setOrder] = useState(days.map(d => d.id).filter((id): id is string => Boolean(id)));
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteDay, setDeleteDay] = useState<ItineraryDay | null>(null);
  useEffect(() => setOrder(days.map(d => d.id).filter((id): id is string => Boolean(id))), [days]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const byId = new Map(days.map(day => [day.id, day]));
  const original = days.map(d => d.id).filter((id): id is string => Boolean(id));
  const dirty = order.some((id, index) => id !== original[index]);
  const dragEnd = (event: DragEndEvent) => { if (!event.over || event.active.id === event.over.id) return; const from = order.indexOf(String(event.active.id)); const to = order.indexOf(String(event.over.id)); if (from >= 0 && to >= 0) setOrder(arrayMove(order, from, to)); };
  return <div className="space-y-4" data-testid="itinerary-days-organizer">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Arraste os dias para mudar a ordem. As atividades e os identificadores são preservados.</p><Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)}><CalendarPlus className="mr-1 h-4 w-4" />Adicionar dia</Button></div>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}><SortableContext items={order} strategy={verticalListSortingStrategy}><div className="space-y-2">{order.map(id => { const day = byId.get(id); return day ? <DayRow key={id} day={day} onDelete={() => days.length > 1 && setDeleteDay(day)} /> : null; })}</div></SortableContext></DndContext>
    <div className="flex justify-end"><Button type="button" size="sm" disabled={!dirty || saving} onClick={async () => { setSaving(true); try { await onReorder(order); } finally { setSaving(false); } }}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar nova ordem</Button></div>
    <AddDayDialog open={addOpen} onOpenChange={setAddOpen} days={days} itineraryStartDate={startDate} onConfirm={onAdd} />
    <DeleteDayDialog open={Boolean(deleteDay)} onOpenChange={open => { if (!open) setDeleteDay(null); }} day={deleteDay} days={days} itineraryStartDate={startDate} itineraryEndDate={endDate} onConfirm={async (plan, mode) => { if (!deleteDay) return; await onDelete(plan, mode, deleteDay); setDeleteDay(null); }} />
  </div>;
}
