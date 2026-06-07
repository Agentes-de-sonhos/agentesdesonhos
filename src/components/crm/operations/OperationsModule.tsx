import { useMemo, useState } from "react";
import { Plus, Kanban as KanbanIcon, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOperations } from "@/hooks/useOperations";
import { useOperationStages } from "@/hooks/useOperationStages";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { DENY_MESSAGE } from "@/hooks/usePermissions";
import { getStageTokens } from "@/types/crm";
import { type Operation } from "@/types/operations";
import { OperationCard, type OperationCardTab } from "./OperationCard";
import { OperationDetailDialog } from "./OperationDetailDialog";
import { CreateOperationDialog } from "./CreateOperationDialog";
import { OperationStageColumnHeader } from "./OperationStageColumnHeader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseLocalDate } from "@/lib/dateParsing";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function OperationsModule() {
  const { operations, isLoading, moveStage, reorderOperations } = useOperations();
  const { stages, createStage, updateStage, duplicateStage, deleteStage } = useOperationStages();
  const { can, isTeamMember } = usePermissions();
  const canCreate = can('operations.create');
  const canEdit = can('operations.edit');
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [selectedTab, setSelectedTab] = useState<OperationCardTab>("overview");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ stageKey: string; targetId: string | null; before: boolean } | null>(null);
  const [calDate, setCalDate] = useState<Date | undefined>(new Date());
  const [deleteStageTarget, setDeleteStageTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(
    () =>
      operations.filter((o) => {
        const q = search.toLowerCase();
        return (
          !q ||
          o.title.toLowerCase().includes(q) ||
          o.destination?.toLowerCase().includes(q) ||
          o.client?.name?.toLowerCase().includes(q)
        );
      }),
    [operations, search]
  );

  const byStage = useMemo(() => {
    const m = new Map<string, Operation[]>();
    stages.forEach((s) => m.set(s.key, []));
    filtered.forEach((o) => {
      if (!m.has(o.stage)) m.set(o.stage, []);
      m.get(o.stage)!.push(o);
    });
    return m;
  }, [filtered, stages]);

  // Calendar events: travel_start_date (embarque) + travel_end_date (retorno)
  const eventsByDate = useMemo(() => {
    const m = new Map<string, { op: Operation; type: "embarque" | "retorno" }[]>();
    filtered.forEach((o) => {
      if (o.travel_start_date) {
        const k = o.travel_start_date;
        m.set(k, [...(m.get(k) || []), { op: o, type: "embarque" }]);
      }
      if (o.travel_end_date) {
        const k = o.travel_end_date;
        m.set(k, [...(m.get(k) || []), { op: o, type: "retorno" }]);
      }
    });
    return m;
  }, [filtered]);

  const eventsOnSelected = useMemo(() => {
    if (!calDate) return [];
    const key = format(calDate, "yyyy-MM-dd");
    return eventsByDate.get(key) || [];
  }, [calDate, eventsByDate]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isTeamMember && !canEdit) {
      e.preventDefault();
      toast.error(DENY_MESSAGE);
      return;
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const performDrop = async (toStageKey: string, targetCardId: string | null, dropBefore: boolean) => {
    if (!draggedId) return;
    const op = operations.find((o) => o.id === draggedId);
    if (!op) return;
    const fromStageKey = op.stage as string;
    const stageChanged = fromStageKey !== toStageKey;

    const targetList = (byStage.get(toStageKey) || []).map((o) => o.id);
    let sourceList: string[] | undefined;
    if (stageChanged) {
      sourceList = (byStage.get(fromStageKey) || []).map((o) => o.id).filter((id) => id !== draggedId);
    } else {
      const idx = targetList.indexOf(draggedId);
      if (idx >= 0) targetList.splice(idx, 1);
    }

    let insertIdx = targetList.length;
    if (targetCardId) {
      const ti = targetList.indexOf(targetCardId);
      if (ti >= 0) insertIdx = dropBefore ? ti : ti + 1;
    }
    targetList.splice(insertIdx, 0, draggedId);

    await reorderOperations({
      movedId: draggedId,
      fromStage: fromStageKey as any,
      toStage: toStageKey as any,
      orderedTargetIds: targetList,
      orderedSourceIds: sourceList,
    });
  };

  const handleColumnDrop = async (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    await performDrop(stageKey, null, false);
    setDraggedId(null);
    setDragOver(null);
  };

  const handleCardDragOver = (e: React.DragEvent, stageKey: string, targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDragOver((prev) =>
      prev && prev.stageKey === stageKey && prev.targetId === targetId && prev.before === before
        ? prev
        : { stageKey, targetId, before }
    );
  };

  const handleCardDrop = async (e: React.DragEvent, stageKey: string, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const before = dragOver?.before ?? true;
    await performDrop(stageKey, targetId, before);
    setDraggedId(null);
    setDragOver(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar operações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Operação
          </Button>
        )}
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1.5"><KanbanIcon className="h-4 w-4" />Kanban</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" />Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-6 text-center">Carregando operações...</div>
          ) : filtered.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
              <p className="font-medium">Nenhuma operação ainda</p>
              <p className="text-sm mt-1">Feche uma oportunidade ou clique em "Nova Operação" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4 touch-pan-x">
              <div className="flex gap-4" style={{ minWidth: "max-content" }}>
                {stages.map((stage) => {
                  const ops = byStage.get(stage.key) || [];
                  const tokens = getStageTokens(stage.color);
                  return (
                    <div
                      key={stage.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleColumnDrop(e, stage.key)}
                      className={cn(
                        "w-[290px] flex-shrink-0 rounded-xl border p-3 min-h-[400px]",
                        tokens.bg,
                        tokens.border
                      )}
                    >
                      <OperationStageColumnHeader
                        stage={stage}
                        count={ops.length}
                        onRename={(name) => updateStage({ id: stage.id, name })}
                        onChangeColor={(color) => updateStage({ id: stage.id, color })}
                        onDuplicate={() => duplicateStage(stage.id)}
                        onRequestDelete={() => setDeleteStageTarget({ id: stage.id, name: stage.name })}
                      />
                      <div className="space-y-2.5">
                        {ops.map((op) => {
                          const isIndicator = dragOver?.stageKey === stage.key && dragOver?.targetId === op.id;
                          return (
                            <div
                              key={op.id}
                              onDragOver={(e) => handleCardDragOver(e, stage.key, op.id)}
                              onDrop={(e) => handleCardDrop(e, stage.key, op.id)}
                              className={cn(
                                isIndicator && dragOver?.before && "border-t-2 border-primary rounded-t-sm pt-0.5",
                                isIndicator && !dragOver?.before && "border-b-2 border-primary rounded-b-sm pb-0.5",
                                draggedId === op.id && "opacity-40"
                              )}
                            >
                              <OperationCard
                                operation={op}
                                onClick={() => { setSelectedTab("overview"); setSelected(op); }}
                                onOpenTab={(t) => { setSelectedTab(t); setSelected(op); }}
                                onDragStart={handleDragStart}
                              />
                            </div>
                          );
                        })}
                        {ops.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground/70 border-2 border-dashed rounded-lg border-muted-foreground/15">
                            Nenhuma operação
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt("Nome da nova coluna");
                    if (name && name.trim()) createStage({ name: name.trim() });
                  }}
                  className="w-[290px] flex-shrink-0 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center text-muted-foreground hover:text-primary p-3 min-h-[400px]"
                >
                  <Plus className="h-5 w-5 mb-1" />
                  <span className="text-sm font-medium">Adicionar coluna</span>
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="grid md:grid-cols-[auto_1fr] gap-6">
            <div>
              <Calendar
                mode="single"
                selected={calDate}
                onSelect={setCalDate}
                locale={ptBR}
                modifiers={{
                  hasEvent: (date) => eventsByDate.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersClassNames={{
                  hasEvent: "font-bold bg-primary/10 text-primary",
                }}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">
                {calDate ? format(calDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
              </h3>
              {eventsOnSelected.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma operação neste dia.</p>
              ) : (
                eventsOnSelected.map(({ op, type }) => (
                  <div
                    key={`${op.id}-${type}`}
                    onClick={() => setSelected(op)}
                    className="cursor-pointer p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{op.client?.name}</span>
                      <Badge variant={type === "embarque" ? "default" : "secondary"} className="text-[10px]">
                        {type === "embarque" ? "Embarque" : "Retorno"}
                      </Badge>
                    </div>
                    {op.destination && <p className="text-xs text-muted-foreground mt-1">{op.destination}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateOperationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <OperationDetailDialog
        operation={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        defaultTab={selectedTab}
      />

      <AlertDialog
        open={!!deleteStageTarget}
        onOpenChange={(o) => !o && setDeleteStageTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coluna "{deleteStageTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As operações desta coluna serão movidas para a primeira coluna do funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteStageTarget) return;
                const first = stages[0];
                await deleteStage({
                  id: deleteStageTarget.id,
                  moveToStageKey: first?.key,
                });
                setDeleteStageTarget(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}