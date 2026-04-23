import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useOpportunityLabels } from "@/hooks/useOpportunityExtras";
import { LABEL_COLOR_PRESETS, type OpportunityLabel } from "@/types/opportunity-extras";
import { cn } from "@/lib/utils";

interface OpportunityLabelsManagerProps {
  /** When provided, renders compact mode for inline use (e.g. inside a popover) */
  compact?: boolean;
}

export function OpportunityLabelsManager({ compact }: OpportunityLabelsManagerProps) {
  const { labels, createLabel, updateLabel, deleteLabel } = useOpportunityLabels();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLOR_PRESETS[0].color);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deletingLabel, setDeletingLabel] = useState<OpportunityLabel | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createLabel({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor(LABEL_COLOR_PRESETS[0].color);
    setIsCreating(false);
  };

  const startEdit = (label: OpportunityLabel) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleEditSave = async () => {
    if (!editingId || !editName.trim()) return;
    await updateLabel({ id: editingId, name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  return (
    <div className={cn("space-y-2", compact ? "p-1" : "p-2")}>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {labels.map((label) => {
          const isEditing = editingId === label.id;
          return (
            <div
              key={label.id}
              className="flex items-center gap-2 group rounded-md hover:bg-muted/50 p-1.5"
            >
              {isEditing ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border border-border bg-transparent"
                  />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditSave}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className="inline-block h-4 w-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm flex-1 truncate">{label.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => startEdit(label)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => setDeletingLabel(label)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          );
        })}
        {labels.length === 0 && !isCreating && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhuma etiqueta criada ainda
          </p>
        )}
      </div>

      {isCreating ? (
        <div className="space-y-2 p-2 rounded-md border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border border-border bg-transparent"
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da etiqueta"
              className="h-8 text-xs flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setIsCreating(false);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {LABEL_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => setNewColor(preset.color)}
                className={cn(
                  "h-5 w-5 rounded-sm transition-transform hover:scale-110",
                  newColor === preset.color && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundColor: preset.color }}
                title={preset.name}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
              Criar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Nova etiqueta
        </Button>
      )}

      <AlertDialog open={!!deletingLabel} onOpenChange={(open) => !open && setDeletingLabel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta "{deletingLabel?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta será removida de todas as oportunidades em que está aplicada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingLabel) await deleteLabel(deletingLabel.id);
                setDeletingLabel(null);
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