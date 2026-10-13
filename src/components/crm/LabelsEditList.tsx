import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
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
import { LABEL_COLOR_PRESETS } from "@/types/opportunity-extras";
import { cn } from "@/lib/utils";

interface EditableLabel {
  id: string;
  name: string;
  color: string;
}

interface LabelsEditListProps {
  labels: EditableLabel[];
  onUpdate: (v: { id: string; name: string; color: string }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  /** e.g. "oportunidades" / "operações" */
  entityPlural: string;
}

/** Scroll container that keeps wheel/touch scrolling working inside modals and popovers. */
export const scrollableListProps = {
  onWheel: (e: React.WheelEvent) => e.stopPropagation(),
  onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
};

export function LabelsEditList({ labels, onUpdate, onDelete, entityPlural }: LabelsEditListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [deleting, setDeleting] = useState<EditableLabel | null>(null);

  const start = (l: EditableLabel) => {
    setEditingId(l.id);
    setName(l.name);
    setColor(l.color);
  };

  const save = async () => {
    if (!editingId || !name.trim()) return;
    await onUpdate({ id: editingId, name: name.trim(), color });
    setEditingId(null);
  };

  return (
    <>
      {labels.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma etiqueta criada ainda</p>
      )}
      {labels.map((l) =>
        editingId === l.id ? (
          <div key={l.id} className="space-y-2 rounded-md border border-border bg-muted/30 p-2 my-1">
            <div className="flex items-center gap-1.5">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setEditingId(null);
                  }
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={save} aria-label="Salvar">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} aria-label="Cancelar">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setColor(p.color)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all hover:scale-110",
                    color === p.color && "ring-2 ring-offset-2 ring-foreground"
                  )}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>
        ) : (
          <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted">
            <span className="inline-block h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
            <span className="text-sm flex-1 truncate">{l.name}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => start(l)} aria-label={`Editar ${l.name}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => setDeleting(l)}
              aria-label={`Excluir ${l.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta será removida de todas as {entityPlural} em que está aplicada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) await onDelete(deleting.id);
                setDeleting(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
