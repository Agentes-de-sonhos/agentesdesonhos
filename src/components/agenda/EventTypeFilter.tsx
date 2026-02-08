import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface EventTypeOption {
  id: string;
  name: string;
  color: string;
  isCustom?: boolean;
}

interface EventTypeFilterProps {
  eventTypes: EventTypeOption[];
  hiddenTypes: string[];
  onToggleType: (typeId: string, hidden: boolean) => void;
  className?: string;
}

export function EventTypeFilter({
  eventTypes,
  hiddenTypes,
  onToggleType,
  className,
}: EventTypeFilterProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50", className)}>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtrar:</span>
      <div className="flex flex-wrap items-center gap-3">
        {eventTypes.map((type) => {
          const isVisible = !hiddenTypes.includes(type.id);
          return (
            <button
              key={type.id}
              onClick={() => onToggleType(type.id, isVisible)}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !isVisible && "opacity-40"
              )}
              title={isVisible ? `Ocultar ${type.name}` : `Mostrar ${type.name}`}
              type="button"
            >
              {/* Circle indicator - single visual element */}
              <div
                className={cn(
                  "w-3 h-3 rounded-full shrink-0 ring-2 transition-all duration-200",
                  isVisible ? "ring-offset-2" : "ring-offset-0 opacity-60"
                )}
                style={{
                  backgroundColor: type.color,
                  borderColor: type.color,
                }}
              />
              {/* Label */}
              <Label
                className={cn(
                  "text-xs font-medium cursor-pointer select-none transition-all duration-200 whitespace-nowrap",
                  !isVisible && "line-through opacity-60"
                )}
              >
                {type.name}
              </Label>
            </button>
          );
        })}
      </div>
    </div>
  );
}
