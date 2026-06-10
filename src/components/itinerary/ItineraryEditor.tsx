import { useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sun,
  Sunset,
  Moon,
  Check,
  Pencil,
  Trash2,
  Plus,
  MapPin,
  Clock,
  DollarSign,
  Loader2,
  X,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ItineraryDay, Activity } from "@/types/itinerary";
import { cn } from "@/lib/utils";
import { useItineraryPeriodImages, type ItineraryPeriod } from "@/hooks/useItineraryPeriodImages";
import { parseLocalDate } from "@/lib/dateParsing";
import { ActivityAIActions, EmptyPeriodAISlot, type AIContext } from "./ActivityAIActions";
import { useItineraryMemory } from "@/hooks/useItineraryMemory";
import { ActivityPhotoThumb } from "./ActivityPhotoThumb";
import { ActivityMediaActions } from "./ActivityMediaActions";

const periodIcons = {
  manha: Sun,
  tarde: Sunset,
  noite: Moon,
};

const periodLabels = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

function DroppablePeriod({
  dayId,
  period,
  isOver,
  children,
  isDragActive,
}: {
  dayId: string;
  period: "manha" | "tarde" | "noite";
  isOver?: boolean;
  children: React.ReactNode;
  isDragActive?: boolean;
}) {
  const { setNodeRef, isOver: over } = useDroppable({
    id: `drop-${dayId}-${period}`,
    data: { dayId, period, type: "period" },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-2 rounded-lg p-1 transition-all duration-150",
        isDragActive && !over && "ring-1 ring-dashed ring-border/60",
        over && "bg-primary/5 ring-2 ring-primary/40 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]"
      )}
    >
      {children}
    </div>
  );
}

function SortableActivityWrap({
  activityId,
  dayId,
  period,
  isApproved,
  children,
}: {
  activityId: string;
  dayId: string;
  period: "manha" | "tarde" | "noite";
  isApproved?: boolean;
  children: (handle: {
    setActivatorNodeRef: (el: HTMLElement | null) => void;
    attributes: React.HTMLAttributes<HTMLElement>;
    listeners: React.DOMAttributes<HTMLElement>;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `activity-${activityId}`,
    data: { activityId, dayId, period, type: "activity" },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "ml-6 rounded-lg border p-3 transition-all duration-150 will-change-transform",
        isApproved
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
          : "border-border bg-card",
        isDragging && "opacity-40 scale-[0.99]"
      )}
    >
      {children({
        setActivatorNodeRef: setActivatorNodeRef as (el: HTMLElement | null) => void,
        attributes: attributes as unknown as React.HTMLAttributes<HTMLElement>,
        listeners: (listeners ?? {}) as unknown as React.DOMAttributes<HTMLElement>,
        isDragging,
      })}
    </div>
  );
}

function DragHandleButton({
  setActivatorNodeRef,
  attributes,
  listeners,
  isDragging,
}: {
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: React.DOMAttributes<HTMLElement>;
  isDragging: boolean;
}) {
  return (
    <button
      ref={setActivatorNodeRef as unknown as React.Ref<HTMLButtonElement>}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Arrastar atividade"
      className={cn(
        "flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground touch-none",
        isDragging && "cursor-grabbing"
      )}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function ActivityDragPreview({ activity }: { activity: Activity }) {
  return (
    <div className="pointer-events-none w-[320px] max-w-[90vw] rotate-[1.5deg] rounded-lg border border-primary/30 bg-card p-3 shadow-2xl ring-1 ring-primary/20">
      <div className="flex items-start gap-3">
        {activity.photoUrl && (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted/50">
            <img
              src={activity.photoUrl}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="truncate font-medium">{activity.title}</h4>
          {activity.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{activity.location}</span>
            </div>
          )}
          {activity.estimatedDuration && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="truncate">{activity.estimatedDuration}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ItineraryEditorProps {
  itineraryId?: string;
  days: ItineraryDay[];
  onUpdateActivity: (activityId: string, updates: Partial<Activity>) => void;
  onDeleteActivity: (activityId: string) => void;
  onAddActivity: (dayId: string, activity: Omit<Activity, "id" | "orderIndex" | "isApproved">) => void;
  onMoveActivity?: (activityId: string, dayId: string, period: "manha" | "tarde" | "noite") => void;
  onReorderActivities?: (updates: { id: string; orderIndex: number }[]) => void;
  onApproveAll: () => void;
  aiContext?: AIContext;
}

export function ItineraryEditor({
  itineraryId,
  days,
  onUpdateActivity,
  onDeleteActivity,
  onAddActivity,
  onMoveActivity,
  onReorderActivities,
  onApproveAll,
  aiContext,
}: ItineraryEditorProps) {
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [addingToDayId, setAddingToDayId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const { getImageForPeriod, setPeriodImage, removePeriodImage, isUploading } =
    useItineraryPeriodImages(itineraryId);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const { memory, learnFromInstruction, recordApproved, recordRemoved } =
    useItineraryMemory(itineraryId);
  const ctx: AIContext = aiContext ?? {};

  const handleFileChange = async (
    dayDate: string,
    period: ItineraryPeriod,
    file: File | undefined
  ) => {
    if (!file) return;
    const key = `${dayDate}-${period}`;
    setUploadingKey(key);
    try {
      await setPeriodImage({ dayDate, period, file });
    } finally {
      setUploadingKey(null);
    }
  };

  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    period: "manha",
    title: "",
    description: "",
    location: "",
    estimatedDuration: "",
    estimatedCost: "",
  });

  const handleSaveEdit = () => {
    if (editingActivity && editingActivity.id) {
      onUpdateActivity(editingActivity.id, {
        title: editingActivity.title,
        description: editingActivity.description,
        location: editingActivity.location,
        estimatedDuration: editingActivity.estimatedDuration,
        estimatedCost: editingActivity.estimatedCost,
      });
      setEditingActivity(null);
    }
  };

  const handleAddActivity = () => {
    if (addingToDayId && newActivity.title && newActivity.period) {
      onAddActivity(addingToDayId, {
        period: newActivity.period as Activity["period"],
        title: newActivity.title,
        description: newActivity.description || null,
        location: newActivity.location || null,
        estimatedDuration: newActivity.estimatedDuration || null,
        estimatedCost: newActivity.estimatedCost || null,
      });
      setAddingToDayId(null);
      setNewActivity({
        period: "manha",
        title: "",
        description: "",
        location: "",
        estimatedDuration: "",
        estimatedCost: "",
      });
    }
  };

  const allApproved = days.every((day) =>
    day.activities.every((a) => a.isApproved)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    const activeData = active.data.current as
      | { activityId?: string; dayId?: string; period?: "manha" | "tarde" | "noite" }
      | undefined;
    const overData = over.data.current as
      | { activityId?: string; dayId?: string; period?: "manha" | "tarde" | "noite"; type?: string }
      | undefined;
    const activityId = activeData?.activityId;
    if (!activityId) return;

    const current = days
      .flatMap((d) => d.activities.map((a) => ({ a, dayId: d.id! })))
      .find((x) => x.a.id === activityId);
    if (!current) return;

    const targetDayId = overData?.dayId;
    const targetPeriod = overData?.period;
    if (!targetDayId || !targetPeriod) return;

    const sameSlot = current.dayId === targetDayId && current.a.period === targetPeriod;
    const isOverActivity = overData?.type === "activity" && !!overData.activityId;

    if (sameSlot) {
      if (!isOverActivity || !onReorderActivities) return;
      const dayActs = days.find((d) => d.id === targetDayId)?.activities ?? [];
      const periodActs = dayActs.filter((a) => a.period === targetPeriod);
      const oldIndex = periodActs.findIndex((a) => a.id === activityId);
      const newIndex = periodActs.findIndex((a) => a.id === overData.activityId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const reordered = arrayMove(periodActs, oldIndex, newIndex);
      onReorderActivities(
        reordered.map((a, idx) => ({ id: a.id!, orderIndex: idx }))
      );
      return;
    }

    if (!onMoveActivity) return;
    onMoveActivity(activityId, targetDayId, targetPeriod);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activityId = (event.active.data.current as { activityId?: string } | undefined)?.activityId;
    setActiveDragId(activityId ?? null);
  };

  const activeActivity = activeDragId
    ? days.flatMap((d) => d.activities).find((a) => a.id === activeDragId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">
            Revisar e Editar Roteiro
          </h3>
          <p className="text-sm text-muted-foreground">
            Aprove, edite ou remova atividades
          </p>
        </div>
        {!allApproved && (
          <Button onClick={onApproveAll} variant="outline">
            <Check className="mr-2 h-4 w-4" />
            Aprovar Todas
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {days.map((day) => (
          <Card key={day.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Dia {day.dayNumber}
                  </CardTitle>
                  <CardDescription>
                    {format(parseLocalDate(day.date), "EEEE, dd 'de' MMMM", {
                      locale: ptBR,
                    })}
                  </CardDescription>
                </div>
                <Dialog
                  open={addingToDayId === day.id}
                  onOpenChange={(open) => !open && setAddingToDayId(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingToDayId(day.id!)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Atividade</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova atividade ao dia {day.dayNumber}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Período</Label>
                        <Select
                          value={newActivity.period}
                          onValueChange={(value) =>
                            setNewActivity({ ...newActivity, period: value as Activity["period"] })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manha">Manhã</SelectItem>
                            <SelectItem value="tarde">Tarde</SelectItem>
                            <SelectItem value="noite">Noite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={newActivity.title}
                          onChange={(e) =>
                            setNewActivity({ ...newActivity, title: e.target.value })
                          }
                          placeholder="Nome da atividade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={newActivity.description || ""}
                          onChange={(e) =>
                            setNewActivity({ ...newActivity, description: e.target.value })
                          }
                          placeholder="Descrição detalhada"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Local</Label>
                          <Input
                            value={newActivity.location || ""}
                            onChange={(e) =>
                              setNewActivity({ ...newActivity, location: e.target.value })
                            }
                            placeholder="Nome do local"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duração</Label>
                          <Input
                            value={newActivity.estimatedDuration || ""}
                            onChange={(e) =>
                              setNewActivity({
                                ...newActivity,
                                estimatedDuration: e.target.value,
                              })
                            }
                            placeholder="Ex: 2 horas"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Custo Estimado</Label>
                        <Input
                          value={newActivity.estimatedCost || ""}
                          onChange={(e) =>
                            setNewActivity({
                              ...newActivity,
                              estimatedCost: e.target.value,
                            })
                          }
                          placeholder="Ex: R$ 50 por pessoa"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddingToDayId(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddActivity}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["manha", "tarde", "noite"] as const).map((period) => {
                const periodActivities = day.activities.filter(
                  (a) => a.period === period
                );
                const Icon = periodIcons[period];

                return (
                  <DroppablePeriod
                    key={period}
                    dayId={day.id!}
                    period={period}
                    isDragActive={!!activeDragId}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {periodLabels[period]}
                    </div>
                    {periodActivities.length === 0 ? (
                      <EmptyPeriodAISlot
                        day={day}
                        period={period}
                        context={ctx}
                        memory={memory}
                        onCreate={(a) => onAddActivity(day.id!, a)}
                      />
                    ) : (
                      <SortableContext
                        items={periodActivities.map((a) => `activity-${a.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                      {periodActivities.map((activity) => (
                        <SortableActivityWrap
                          key={activity.id}
                          activityId={activity.id!}
                          dayId={day.id!}
                          period={period}
                          isApproved={activity.isApproved}
                        >
                          {(handle) => (
                          <div className="flex items-start justify-between gap-3">
                            {onMoveActivity && activity.id && (
                              <DragHandleButton {...handle} />
                            )}
                            {activity.photoUrl ? (
                              <div className="shrink-0 overflow-hidden rounded-md border bg-muted/50 h-16 w-16 sm:h-20 sm:w-20">
                                <img
                                  src={activity.photoUrl}
                                  alt={activity.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <ActivityPhotoThumb
                                title={activity.title}
                                location={activity.location}
                                destination={ctx.destination}
                                onResolved={(url) => {
                                  if (!activity.photoUrl && activity.id) {
                                    onUpdateActivity(activity.id, { photoUrl: url } as Partial<Activity>);
                                  }
                                }}
                              />
                            )}
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{activity.title}</h4>
                                {activity.isApproved && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                    <Check className="mr-1 h-3 w-3" />
                                    Aprovada
                                  </Badge>
                                )}
                              </div>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
                                  {activity.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {activity.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {activity.location}
                                  </span>
                                )}
                                {activity.estimatedDuration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {activity.estimatedDuration}
                                  </span>
                                )}
                                {activity.estimatedCost && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {activity.estimatedCost}
                                  </span>
                                )}
                              </div>
                              <ActivityMediaActions
                                itineraryId={itineraryId}
                                activityId={activity.id}
                                activityTitle={activity.title}
                                activityLocation={activity.location}
                                destination={ctx.destination}
                                photoUrl={activity.photoUrl ?? null}
                                documentUrls={activity.documentUrls ?? []}
                                onChange={(updates) =>
                                  onUpdateActivity(activity.id!, updates as Partial<Activity>)
                                }
                              />
                            </div>
                            <div className="flex gap-1">
                              {!activity.isApproved && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    {
                                      onUpdateActivity(activity.id!, {
                                        isApproved: true,
                                      } as Partial<Activity>);
                                      recordApproved(activity.title);
                                    }
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <ActivityAIActions
                                activity={activity}
                                day={day}
                                context={ctx}
                                memory={memory}
                                onApplyUpdate={(updates) =>
                                  onUpdateActivity(activity.id!, updates)
                                }
                                onLearnInstruction={learnFromInstruction}
                              />
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingActivity(activity)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Editar Atividade</DialogTitle>
                                  </DialogHeader>
                                  {editingActivity && (
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label>Título</Label>
                                        <Input
                                          value={editingActivity.title}
                                          onChange={(e) =>
                                            setEditingActivity({
                                              ...editingActivity,
                                              title: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Descrição</Label>
                                        <Textarea
                                          value={editingActivity.description || ""}
                                          onChange={(e) =>
                                            setEditingActivity({
                                              ...editingActivity,
                                              description: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Local</Label>
                                          <Input
                                            value={editingActivity.location || ""}
                                            onChange={(e) =>
                                              setEditingActivity({
                                                ...editingActivity,
                                                location: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Duração</Label>
                                          <Input
                                            value={
                                              editingActivity.estimatedDuration || ""
                                            }
                                            onChange={(e) =>
                                              setEditingActivity({
                                                ...editingActivity,
                                                estimatedDuration: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Custo Estimado</Label>
                                        <Input
                                          value={editingActivity.estimatedCost || ""}
                                          onChange={(e) =>
                                            setEditingActivity({
                                              ...editingActivity,
                                              estimatedCost: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button onClick={handleSaveEdit}>
                                      Salvar
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <ConfirmDeleteDialog
                                onConfirm={() => {
                                  recordRemoved(activity.title);
                                  onDeleteActivity(activity.id!);
                                }}
                                title="Excluir atividade?"
                                description="Esta atividade será removida permanentemente do roteiro. Tem certeza?"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </ConfirmDeleteDialog>
                            </div>
                          </div>
                          )}
                        </SortableActivityWrap>
                      ))}
                      </SortableContext>
                    )}
                  </DroppablePeriod>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
      {activeActivity ? <ActivityDragPreview activity={activeActivity} /> : null}
    </DragOverlay>
    </DndContext>
  );
}
