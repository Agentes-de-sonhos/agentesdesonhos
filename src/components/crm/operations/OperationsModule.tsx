import { useMemo, useState } from "react";
import { Plus, Search, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useOperations } from "@/hooks/useOperations";
import { useOperationStages } from "@/hooks/useOperationStages";
import { usePermissions } from "@/hooks/usePermissions";
import { useKanbanMaximize } from "@/components/crm/kanban/KanbanMaximizeContext";
import { KanbanScrollArea } from "@/components/crm/kanban/KanbanScrollArea";
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
export function OperationsModule() {
  const { operations, isLoading, moveStage, reorderOperations } = useOperations();
  const { stages, createStage, updateStage, duplicateStage, deleteStage } = useOperationStages();
  const { can, canStage, isTeamMember } = usePermissions();
  const canCreate = can('operations.create');
  const canEdit = can('operations.edit');
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [selectedTab, setSelectedTab] = useState<OperationCardTab>("overview");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ stageKey: string; targetId: string | null; before: boolean } | null>(null);
  const [deleteStageTarget, setDeleteStageTarget] = useState<{ id: string; name: string } | null>(null);
  const { isMaximized, toggle: toggleMaximize } = useKanbanMaximize();

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

    // Mudança de etapa: o card sempre entra na primeira posição da nova coluna.
    // Reordenação dentro da mesma etapa: mantém o posicionamento livre por drag and drop.
    let insertIdx = stageChanged ? 0 : targetList.length;
    if (!stageChanged && targetCardId) {
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
    <div
      className={cn(
        isMaximized ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-4"
      )}
    >
      <KanbanToolbarSlot>
        <div className="relative w-[150px] shrink-0 lg:w-[190px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar operações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        {canCreate && (
          <Button size="sm" className="h-8 shrink-0 gap-1 px-2.5 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        )}
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


      <div className={cn(isMaximized && "flex min-h-0 flex-1 flex-col")}>
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-6 text-center">Carregando operações...</div>
        ) : (
          <KanbanScrollArea>
            <div
              className={cn("flex gap-4", isMaximized && "h-full items-stretch")}
              style={{ minWidth: "max-content" }}
            >
              {stages.map((stage) => {
                const ops = byStage.get(stage.key) || [];
                const tokens = getStageTokens(stage.color);
                const stageCanEdit = canStage('operations', stage.id, 'edit');
                return (
                  <div
                    key={stage.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleColumnDrop(e, stage.key)}
                    className={cn(
                      "w-[290px] flex-shrink-0 rounded-xl border p-3",
                      isMaximized ? "flex h-full min-h-0 flex-col" : "min-h-[400px]",
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
                      canEdit={stageCanEdit}
                    />
                    <div
                      className={cn(
                        "space-y-2.5",
                        isMaximized && "min-h-0 flex-1 overflow-y-auto pr-0.5 scrollbar-thin"
                      )}
                    >

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
                className={cn(
                  "w-[290px] flex-shrink-0 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center text-muted-foreground hover:text-primary p-3",
                  isMaximized ? "h-full" : "min-h-[400px]"
                )}
              >
                <Plus className="h-5 w-5 mb-1" />
                <span className="text-sm font-medium">Adicionar coluna</span>
              </button>
            </div>
          </KanbanScrollArea>
        )}
      </div>

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