import { useState, useMemo } from "react";
import { format, differenceInDays, differenceInHours, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Filter, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OpportunityCard } from "./OpportunityCard";
import { OpportunityForm } from "./OpportunityForm";
import { StageColumnHeader } from "./StageColumnHeader";
import { AddStageColumn } from "./AddStageColumn";
import { DeleteStageDialog } from "./DeleteStageDialog";
import { QuickAddClientDialog } from "./QuickAddClientDialog";
import { useOpportunities, useClients } from "@/hooks/useCRM";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { usePermissions } from "@/hooks/usePermissions";
import { useKanbanMaximize } from "@/components/crm/kanban/KanbanMaximizeContext";
import { KanbanScrollArea } from "@/components/crm/kanban/KanbanScrollArea";
import { toast } from "sonner";
import { DENY_MESSAGE } from "@/hooks/usePermissions";
import {
  getStageTokens,
  type Opportunity,
  type PipelineStage,
  type StageColor,
} from "@/types/crm";
import { cn } from "@/lib/utils";

function SortableColumn({
  stage,
  children,
}: {
  stage: PipelineStage;
  children: (handle: {
    dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });
  const { isMaximized } = useKanbanMaximize();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("w-[290px] flex-shrink-0", isMaximized && "h-full")}
    >
      {children({
        dragHandleProps: { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>,
        isDragging,
      })}
    </div>
  );
}

export function KanbanBoard() {
  const { opportunities, isLoading, updateStage, reorderOpportunities } = useOpportunities();
  const { clients } = useClients();
  const { can, canStage, isTeamMember } = usePermissions();
  const canCreateOpp = can('opportunities.create');
  const canEditOpp = can('opportunities.edit');
  const {
    stages,
    isLoading: stagesLoading,
    createStage,
    updateStage: updateStageColumn,
    duplicateStage,
    deleteStage,
    reorderStages,
  } = usePipelineStages();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ stageId: string; targetId: string | null; before: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PipelineStage | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { isMaximized, toggle: toggleMaximize } = useKanbanMaximize();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.destination.toLowerCase().includes(search.toLowerCase()) ||
      opp.client?.name.toLowerCase().includes(search.toLowerCase());
    const matchesClient = filterClient === "all" || opp.client_id === filterClient;
    return matchesSearch && matchesClient;
  });

  // Group opportunities by stage_id (fallback to legacy_key matching)
  const opportunitiesByStage = useMemo(() => {
    const map = new Map<string, Opportunity[]>();
    stages.forEach((s) => map.set(s.id, []));
    filteredOpportunities.forEach((opp) => {
      let bucket = opp.stage_id ? map.get(opp.stage_id) : undefined;
      if (!bucket) {
        const match = stages.find((s) => s.legacy_key === opp.stage);
        if (match) bucket = map.get(match.id);
      }
      if (bucket) bucket.push(opp);
    });
    return map;
  }, [stages, filteredOpportunities]);

  const getOpportunitiesForStage = (stageId: string) =>
    opportunitiesByStage.get(stageId) || [];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isTeamMember) {
      const opp = opportunities.find(o => o.id === id);
      const fromStageRow = stages.find(s => s.id === opp?.stage_id || s.legacy_key === opp?.stage);
      if (fromStageRow && !canStage('opportunities', fromStageRow.id, 'move')) {
        e.preventDefault();
        toast.error(DENY_MESSAGE);
        return;
      }
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const performDrop = async (toStage: PipelineStage, targetCardId: string | null, dropBefore: boolean) => {
    if (!draggedId) return;
    const opportunity = opportunities.find((o) => o.id === draggedId);
    if (!opportunity) return;

    const fromStage = stages.find(
      (s) => s.id === opportunity.stage_id || s.legacy_key === opportunity.stage
    );
    const fromStageId = fromStage?.id;
    const stageChanged = fromStageId !== toStage.id;

    // Permission guards
    if (isTeamMember && !canStage('opportunities', toStage.id, 'move')) {
      toast.error(DENY_MESSAGE);
      return;
    }
    if (isTeamMember && stageChanged && fromStageId && !canStage('opportunities', fromStageId, 'move')) {
      toast.error(DENY_MESSAGE);
      return;
    }

    // Build new ordered lists for target (and source) columns
    const targetList = (opportunitiesByStage.get(toStage.id) || []).map((o) => o.id);
    let sourceList: string[] | undefined;
    if (stageChanged && fromStageId) {
      sourceList = (opportunitiesByStage.get(fromStageId) || []).map((o) => o.id).filter((id) => id !== draggedId);
    } else {
      // same column: remove from current position first
      const idx = targetList.indexOf(draggedId);
      if (idx >= 0) targetList.splice(idx, 1);
    }

    // Mudança de etapa: o card sempre entra na primeira posição da nova coluna.
    // Reordenação dentro da mesma etapa: mantém o posicionamento livre por drag and drop.
    let insertIdx = stageChanged ? 0 : targetList.length;
    if (!stageChanged && targetCardId) {
      const ti = targetList.indexOf(targetCardId);
      if (ti >= 0) insertIdx = dropBefore ? ti : ti + 1;
    }
    targetList.splice(insertIdx, 0, draggedId);


    await reorderOpportunities({
      movedId: draggedId,
      fromStageId,
      toStageId: toStage.id,
      toStageLegacyKey: toStage.legacy_key,
      fromStageLegacyKey: fromStage?.legacy_key || opportunity.stage,
      fromStageLabel: fromStage?.name,
      toStageLabel: toStage.name,
      orderedTargetIds: targetList,
      orderedSourceIds: sourceList,
    });
  };

  const handleColumnDrop = async (e: React.DragEvent, toStage: PipelineStage) => {
    e.preventDefault();
    await performDrop(toStage, null, false);
    setDraggedId(null);
    setDragOver(null);
  };

  const handleCardDragOver = (e: React.DragEvent, stageId: string, targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDragOver((prev) =>
      prev && prev.stageId === stageId && prev.targetId === targetId && prev.before === before
        ? prev
        : { stageId, targetId, before }
    );
  };

  const handleCardDrop = async (e: React.DragEvent, toStage: PipelineStage, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const before = dragOver?.before ?? true;
    await performDrop(toStage, targetCardId, before);
    setDraggedId(null);
    setDragOver(null);
  };

  const getTotalValue = (stageId: string) =>
    getOpportunitiesForStage(stageId).reduce((sum, o) => sum + o.estimated_value, 0);

  const getAverageTimeInStage = (stageId: string) => {
    const stageOpps = getOpportunitiesForStage(stageId);
    if (stageOpps.length === 0) return null;

    const totalHours = stageOpps.reduce((sum, opp) => {
      const enteredAt = new Date(opp.stage_entered_at);
      return sum + differenceInHours(new Date(), enteredAt);
    }, 0);

    const avgHours = totalHours / stageOpps.length;
    if (avgHours < 24) return `${Math.round(avgHours)}h`;
    return `${Math.round(avgHours / 24)}d`;
  };

  const hasOverdueFollowUp = (opp: Opportunity) => {
    if (!opp.follow_up_date) return false;
    const followUpDate = new Date(opp.follow_up_date);
    return isPast(followUpDate) && !isToday(followUpDate);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleStageDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(stages, oldIndex, newIndex);
    await reorderStages(reordered.map((s) => s.id));
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          isMaximized ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-4"
        )}
      >
        <KanbanToolbarSlot>
          <div className="relative w-[150px] shrink-0 lg:w-[190px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar oportunidades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="h-8 w-[130px] shrink-0 text-xs lg:w-[150px]">
              <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder="Filtrar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {canCreateOpp && (
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 shrink-0 gap-1 px-2.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Nova
                </Button>
              </DialogTrigger>
            )}
            <DialogContent
              className="sm:max-w-4xl max-h-[90vh] flex flex-col"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Nova Oportunidade</DialogTitle>
              </DialogHeader>
              <OpportunityForm
                onSuccess={() => setIsDialogOpen(false)}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
            onClick={toggleMaximize}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isMaximized ? "Minimizar" : "Maximizar"}
          </Button>
        </KanbanToolbarSlot>


        {/* Kanban container: arraste com o mouse + barra horizontal única no final */}
        <div className={cn("relative", isMaximized && "flex min-h-0 flex-1 flex-col")}>
          <KanbanScrollArea>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStageDragEnd}
            >
              <SortableContext
                items={stages.map((s) => s.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div
                  className={cn("flex gap-4", isMaximized && "h-full items-stretch")}
                  style={{ minWidth: "max-content" }}
                >
                  {stages
                    .filter(s => canStage('opportunities', s.id, 'view'))
                    .map((stage, index) => {
                    const stageOpps = getOpportunitiesForStage(stage.id);
                    const overdueCount = stageOpps.filter(hasOverdueFollowUp).length;
                    const tokens = getStageTokens(stage.color);
                    const isFirstStage = index === 0;
                    const isLastStage = index === stages.length - 1;
                    const isSecondToLastStage = index === stages.length - 2;
                    const isQuoteSentStage = stage.legacy_key === "quote_sent";
                    const isProtected =
                      isFirstStage || isLastStage || isSecondToLastStage || isQuoteSentStage;
                    const stageCanMove = canStage('opportunities', stage.id, 'move');
                    const stageCanEdit = canStage('opportunities', stage.id, 'edit');

                    return (
                      <SortableColumn key={stage.id} stage={stage}>
                        {({ dragHandleProps, isDragging }) => (
                          <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleColumnDrop(e, stage)}
                            className={cn(isMaximized && "flex h-full min-h-0 flex-col")}
                          >
                            <div
                              className={cn(
                                "rounded-xl border p-3 transition-shadow",
                                isMaximized ? "flex h-full min-h-0 flex-col" : "min-h-[400px]",
                                tokens.bg,
                                tokens.border,
                                isDragging && "shadow-xl ring-2 ring-primary/30"
                              )}
                            >

                              <StageColumnHeader
                                stage={stage}
                                count={stageOpps.length}
                                overdueCount={overdueCount}
                                dragHandleProps={dragHandleProps}
                                isDragging={isDragging}
                                onRename={(name) => updateStageColumn({ id: stage.id, name })}
                                onChangeColor={(color) =>
                                  updateStageColumn({ id: stage.id, color })
                                }
                                onDuplicate={() => duplicateStage(stage.id)}
                                onRequestDelete={() => setDeleteTarget(stage)}
                                onQuickAdd={isFirstStage ? () => setQuickAddOpen(true) : undefined}
                                isProtected={isProtected}
                                canEdit={stageCanEdit}
                              />

                              <div
                                className={cn(
                                  "space-y-2.5 min-h-[100px]",
                                  isMaximized &&
                                    "min-h-0 flex-1 overflow-y-auto pr-0.5 scrollbar-thin"
                                )}
                              >

                                {stageOpps.map((opportunity) => {
                                  const isIndicator = dragOver?.stageId === stage.id && dragOver?.targetId === opportunity.id;
                                  return (
                                    <div
                                      key={opportunity.id}
                                      onDragOver={(e) => handleCardDragOver(e, stage.id, opportunity.id)}
                                      onDrop={(e) => handleCardDrop(e, stage, opportunity.id)}
                                      className={cn(
                                        "transition-shadow",
                                        isIndicator && dragOver?.before && "border-t-2 border-primary rounded-t-sm pt-0.5",
                                        isIndicator && !dragOver?.before && "border-b-2 border-primary rounded-b-sm pb-0.5",
                                        draggedId === opportunity.id && "opacity-40"
                                      )}
                                    >
                                      <OpportunityCard
                                        opportunity={opportunity}
                                        onDragStart={handleDragStart}
                                        isOverdue={hasOverdueFollowUp(opportunity)}
                                      />
                                    </div>
                                  );
                                })}
                                {stageOpps.length === 0 && (
                                  <div className="flex flex-col items-center justify-center text-center py-10 px-3 text-xs text-muted-foreground/70 border-2 border-dashed rounded-lg border-muted-foreground/15">
                                    <span className="text-lg mb-1">✨</span>
                                    <span className="font-medium text-muted-foreground">
                                      Nenhum card aqui ainda
                                    </span>
                                    <span className="text-[11px] mt-0.5">
                                      Arraste oportunidades para esta coluna
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </SortableColumn>
                    );
                  })}
                  {!stagesLoading && (
                    <AddStageColumn
                      onCreate={async (name, color) => {
                        await createStage({ name, color });
                      }}
                    />
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </KanbanScrollArea>
        </div>

        <DeleteStageDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          stage={deleteTarget}
          allStages={stages}
          opportunitiesCount={
            deleteTarget ? getOpportunitiesForStage(deleteTarget.id).length : 0
          }
          onConfirm={async (moveToStageId) => {
            if (!deleteTarget) return;
            await deleteStage({ id: deleteTarget.id, moveToStageId });
          }}
        />

        <QuickAddClientDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      </div>
    </TooltipProvider>
  );
}
