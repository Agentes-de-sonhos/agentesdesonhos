import { useMemo, useState } from "react";
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, FolderPlus, GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ServiceCard, ServiceList } from "@/components/quote/ServiceCard";
import type { QuoteSection, QuoteService } from "@/types/quote";
import type { QuoteCurrency } from "@/lib/quoteCurrency";
import {
  buildQuoteSectionLayout, flattenServiceOrder, moveServiceInLayout, type QuoteSectionLayout,
} from "@/lib/quoteSections";

const UNSECTIONED = "__unsectioned__";

interface Props {
  services: QuoteService[];
  sections: QuoteSection[];
  currency?: QuoteCurrency;
  onDeleteService: (id: string) => void;
  onEditService: (service: QuoteService) => void;
  /** Flat reorder, used when the quote has no manual sections. */
  onReorderServices: (orderedIds: string[]) => void;
  onSaveLayout: (rows: { id: string; section_id: string | null; order_index: number }[]) => Promise<unknown> | void;
  onCreateSection: (title: string) => Promise<unknown> | void;
  onRenameSection: (args: { sectionId: string; title: string }) => Promise<unknown> | void;
  onDeleteSection: (sectionId: string) => Promise<unknown> | void;
  onReorderSections: (orderedIds: string[]) => Promise<unknown> | void;
  onAddServiceToSection?: (sectionId: string) => void;
  isSaving?: boolean;
}

export function QuoteServicesOrganizer({
  services, sections, currency = "BRL",
  onDeleteService, onEditService, onReorderServices, onSaveLayout,
  onCreateSection, onRenameSection, onDeleteSection, onReorderSections,
  onAddServiceToSection, isSaving,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState<QuoteSection | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleting, setDeleting] = useState<QuoteSection | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const layout = useMemo(() => buildQuoteSectionLayout(sections, services), [sections, services]);
  const hasSections = (sections?.length ?? 0) > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerOf = (layoutRef: QuoteSectionLayout, serviceId: string): string | null => {
    for (const g of layoutRef.groups) {
      if (g.services.some((s) => s.id === serviceId)) return g.section.id;
    }
    return layoutRef.unsectioned.some((s) => s.id === serviceId) ? UNSECTIONED : null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeType = (active.data.current as any)?.type;
    const overType = (over.data.current as any)?.type;

    // Reordering sections
    if (activeType === "section") {
      if (overType !== "section" || active.id === over.id) return;
      const ids = layout.groups.map((g) => g.section.id);
      const from = ids.indexOf(String(active.id).replace("section:", ""));
      const to = ids.indexOf(String(over.id).replace("section:", ""));
      if (from < 0 || to < 0) return;
      const next = [...ids];
      next.splice(to, 0, next.splice(from, 1)[0]);
      await onReorderSections(next);
      return;
    }

    if (activeType !== "service") return;
    const serviceId = String(active.id);

    // Target container: either a container droppable, or another service's container
    let targetContainer: string | null = null;
    let targetIndex: number | undefined;
    if (overType === "container") {
      targetContainer = String((over.data.current as any).containerId);
    } else if (overType === "service") {
      targetContainer = containerOf(layout, String(over.id));
      if (targetContainer) {
        const list = targetContainer === UNSECTIONED
          ? layout.unsectioned
          : layout.groups.find((g) => g.section.id === targetContainer)?.services ?? [];
        targetIndex = list.findIndex((s) => s.id === String(over.id));
        const sourceContainer = containerOf(layout, serviceId);
        if (sourceContainer === targetContainer) {
          const fromIndex = list.findIndex((s) => s.id === serviceId);
          if (fromIndex === targetIndex) return;
        }
      }
    }
    if (!targetContainer) return;

    const next = moveServiceInLayout(
      layout,
      serviceId,
      targetContainer === UNSECTIONED ? null : targetContainer,
      targetIndex,
    );
    await onSaveLayout(flattenServiceOrder(next));
  };

  const addSectionButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => { setNewTitle(""); setCreateOpen(true); }}
      className="gap-2"
    >
      <FolderPlus className="h-4 w-4" />
      Adicionar seção
    </Button>
  );

  return (
    <div className="space-y-4">
      {services.length === 0 && !hasSections ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
          {addSectionButton}
          <p className="text-sm text-muted-foreground">
            Organize os serviços em seções (ex.: Orlando, Miami).
          </p>
          <p className="text-sm text-muted-foreground">
            Você pode criar seções agora e adicionar os serviços depois.
          </p>
          <p className="text-sm text-muted-foreground">
            Nenhum serviço adicionado ainda.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Organize os serviços em seções (ex.: Orlando, Miami).
            </p>
            <div className="flex items-center gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {addSectionButton}
            </div>
          </div>

          {!hasSections ? (
            <ServiceList
              services={services}
              onDeleteService={onDeleteService}
              onEditService={onEditService}
              onReorder={onReorderServices}
              currency={currency}
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <SortableContext
                items={layout.groups.map((g) => `section:${g.section.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {layout.groups.map((group) => (
                    <SortableSection
                      key={group.section.id}
                      section={group.section}
                      count={group.services.length}
                      collapsed={!!collapsed[group.section.id]}
                      onToggle={() =>
                        setCollapsed((prev) => ({ ...prev, [group.section.id]: !prev[group.section.id] }))
                      }
                      onRename={() => { setRenaming(group.section); setRenameTitle(group.section.title); }}
                      onDelete={() => setDeleting(group.section)}
                      onAddService={onAddServiceToSection ? () => onAddServiceToSection(group.section.id) : undefined}
                    >
                      <ServiceDropArea
                        containerId={group.section.id}
                        services={group.services}
                        emptyLabel="Arraste serviços para esta seção"
                        onDeleteService={onDeleteService}
                        onEditService={onEditService}
                        currency={currency}
                      />
                    </SortableSection>
                  ))}
                </div>
              </SortableContext>

              <div className="mt-4 rounded-xl border border-dashed border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-foreground">Sem seção</span>
                  <Badge variant="secondary" className="text-xs">{layout.unsectioned.length}</Badge>
                </div>
                <ServiceDropArea
                  containerId={UNSECTIONED}
                  services={layout.unsectioned}
                  emptyLabel="Nenhum serviço fora das seções"
                  onDeleteService={onDeleteService}
                  onEditService={onEditService}
                  currency={currency}
                />
              </div>
            </DndContext>
          )}
        </>
      )}

      {/* Criar seção */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova seção</DialogTitle>
            <DialogDescription>
              Ex.: Orlando, Miami, Parte aérea ou Opção premium.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="section-title">Nome da seção</Label>
            <Input
              id="section-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Orlando"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              disabled={!newTitle.trim()}
              onClick={async () => {
                await onCreateSection(newTitle.trim());
                setCreateOpen(false);
                setNewTitle("");
              }}
            >
              Criar seção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renomear seção */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear seção</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="section-rename">Nome da seção</Label>
            <Input
              id="section-rename"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancelar</Button>
            <Button
              disabled={!renameTitle.trim()}
              onClick={async () => {
                if (renaming) await onRenameSection({ sectionId: renaming.id, title: renameTitle.trim() });
                setRenaming(null);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir seção */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seção “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Os serviços não serão apagados: eles serão mantidos e movidos para “Sem seção”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) await onDeleteSection(deleting.id);
                setDeleting(null);
              }}
            >
              Excluir seção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableSection({
  section, count, collapsed, onToggle, onRename, onDelete, onAddService, children,
}: {
  section: QuoteSection;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddService?: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section:${section.id}`,
    data: { type: "section", sectionId: section.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-xl border border-border bg-card/60 overflow-hidden",
        isDragging && "opacity-70 shadow-lg",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          aria-label="Reordenar seção"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left min-w-0"
          aria-expanded={!collapsed}
        >
          <span className="font-medium text-sm text-foreground truncate">{section.title}</span>
          <Badge variant="secondary" className="text-xs shrink-0">{count}</Badge>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform ml-auto shrink-0", !collapsed && "rotate-180")}
          />
        </button>
        {onAddService && (
          <Button type="button" variant="ghost" size="icon" onClick={onAddService} aria-label="Adicionar serviço nesta seção">
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={onRename} aria-label="Renomear seção">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Excluir seção">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {!collapsed && <div className="p-3">{children}</div>}
    </div>
  );
}

function ServiceDropArea({
  containerId, services, emptyLabel, onDeleteService, onEditService, currency,
}: {
  containerId: string;
  services: QuoteService[];
  emptyLabel: string;
  onDeleteService: (id: string) => void;
  onEditService: (service: QuoteService) => void;
  currency?: QuoteCurrency;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `container:${containerId}`,
    data: { type: "container", containerId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-3 rounded-lg transition-colors min-h-[56px]",
        isOver && "bg-primary/5 ring-1 ring-primary/30",
      )}
    >
      <SortableContext items={services.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {services.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{emptyLabel}</p>
        ) : (
          services.map((service) => (
            <SortableServiceRow
              key={service.id}
              service={service}
              onDelete={onDeleteService}
              onEdit={onEditService}
              currency={currency}
            />
          ))
        )}
      </SortableContext>
    </div>
  );
}

function SortableServiceRow({
  service, onDelete, onEdit, currency,
}: {
  service: QuoteService;
  onDelete: (id: string) => void;
  onEdit: (service: QuoteService) => void;
  currency?: QuoteCurrency;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.id,
    data: { type: "service", serviceId: service.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-60")}
    >
      <ServiceCard
        service={service}
        onDelete={onDelete}
        onEdit={onEdit}
        currency={currency}
        dragHandle={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            aria-label="Mover serviço"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}
