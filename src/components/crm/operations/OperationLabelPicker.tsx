import { useState, useMemo } from "react";
import { Check, Plus, Search, Tag as TagIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useOperationLabels,
  useOperationLabelAssignments,
} from "@/hooks/useOperationLabels";
import { LABEL_COLOR_PRESETS } from "@/types/opportunity-extras";
import { cn } from "@/lib/utils";

interface OperationLabelPickerProps {
  operationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function textColorFor(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1a1a1a" : "#ffffff";
}

export function OperationLabelPicker({ operationId, open, onOpenChange }: OperationLabelPickerProps) {
  const { labels, createLabel } = useOperationLabels();
  const { byOperation, assignLabel, unassignLabel } = useOperationLabelAssignments();
  const [search, setSearch] = useState("");
  const [creatingColor, setCreatingColor] = useState(LABEL_COLOR_PRESETS[0].color);
  const [isCreating, setIsCreating] = useState(false);

  const appliedIds = useMemo(
    () => new Set((byOperation[operationId] || []).map((l) => l.id)),
    [byOperation, operationId]
  );

  const filtered = useMemo(
    () => labels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase().trim())),
    [labels, search]
  );

  const exactMatch = labels.some(
    (l) => l.name.toLowerCase() === search.trim().toLowerCase()
  );
  const canCreate = search.trim().length > 0 && !exactMatch;

  const toggle = async (labelId: string) => {
    if (appliedIds.has(labelId)) {
      await unassignLabel({ operationId, labelId });
    } else {
      await assignLabel({ operationId, labelId });
    }
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      const created = await createLabel({ name, color: creatingColor });
      if (created?.id) {
        await assignLabel({ operationId, labelId: created.id });
      }
      setSearch("");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <TagIcon className="h-4 w-4" />
            Etiquetas
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar ou criar etiqueta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (canCreate) handleCreate();
                  else if (filtered.length === 1) toggle(filtered[0].id);
                }
              }}
              className="h-9 pl-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && labels.length === 0 && !search && (
            <div className="text-center py-8 px-4">
              <TagIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma etiqueta criada ainda</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Digite acima para criar a primeira</p>
            </div>
          )}

          {filtered.map((label) => {
            const applied = appliedIds.has(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors hover:bg-muted"
              >
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: label.color, color: textColorFor(label.color) }}
                >
                  {label.name}
                </span>
                <span className="flex-1" />
                {applied && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
              </button>
            );
          })}

          {filtered.length === 0 && labels.length > 0 && !canCreate && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma etiqueta encontrada</p>
          )}
        </div>

        {canCreate && (
          <div className="border-t border-border bg-muted/30 p-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Criar nova etiqueta
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setCreatingColor(p.color)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all hover:scale-110",
                    creatingColor === p.color && "ring-2 ring-offset-2 ring-foreground"
                  )}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
            <Button type="button" size="sm" className="w-full h-8" onClick={handleCreate} disabled={isCreating}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Criar "{search.trim()}"
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}