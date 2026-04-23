import { useState } from "react";
import { Check, Tag, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  useOpportunityLabels,
  useOpportunityLabelAssignments,
} from "@/hooks/useOpportunityExtras";
import { OpportunityLabelsManager } from "./OpportunityLabelsManager";
import { cn } from "@/lib/utils";

interface OpportunityLabelPickerProps {
  opportunityId: string;
  /** Optional trigger element. Defaults to a small Tag button */
  trigger?: React.ReactNode;
}

export function OpportunityLabelPicker({ opportunityId, trigger }: OpportunityLabelPickerProps) {
  const { labels } = useOpportunityLabels();
  const { byOpportunity, assignLabel, unassignLabel } = useOpportunityLabelAssignments();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"select" | "manage">("select");

  const appliedIds = new Set((byOpportunity[opportunityId] || []).map((l) => l.id));
  const filtered = labels.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleLabel = async (labelId: string) => {
    if (appliedIds.has(labelId)) {
      await unassignLabel({ opportunityId, labelId });
    } else {
      await assignLabel({ opportunityId, labelId });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="h-7 gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Etiquetas
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-2 border-b border-border">
          <span className="text-sm font-semibold">
            {view === "select" ? "Etiquetas" : "Gerenciar etiquetas"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => setView(view === "select" ? "manage" : "select")}
          >
            {view === "select" ? (
              <>
                <Settings className="h-3.5 w-3.5" /> Gerenciar
              </>
            ) : (
              "Voltar"
            )}
          </Button>
        </div>

        {view === "select" ? (
          <div className="p-2 space-y-2">
            {labels.length > 0 && (
              <Input
                placeholder="Buscar etiqueta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((label) => {
                const applied = appliedIds.has(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      "w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-colors hover:bg-muted/60",
                      applied && "bg-muted/40"
                    )}
                  >
                    <span
                      className="inline-block h-5 w-12 rounded flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm flex-1 truncate">{label.name}</span>
                    {applied && <Check className="h-4 w-4 text-foreground" />}
                  </button>
                );
              })}
              {labels.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma etiqueta criada.
                  <br />
                  Clique em "Gerenciar" para criar.
                </p>
              )}
              {labels.length > 0 && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nenhuma etiqueta encontrada
                </p>
              )}
            </div>
          </div>
        ) : (
          <OpportunityLabelsManager compact />
        )}
      </PopoverContent>
    </Popover>
  );
}