import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
    <div className={cn("flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border", className)}>
      <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar:</span>
      {eventTypes.map((type) => {
        const isVisible = !hiddenTypes.includes(type.id);
        return (
          <div
            key={type.id}
            className="flex items-center gap-1.5 cursor-pointer group"
            onClick={() => onToggleType(type.id, isVisible)}
          >
            <Checkbox
              checked={isVisible}
              onCheckedChange={(checked) => onToggleType(type.id, !checked)}
              className="h-3.5 w-3.5"
              style={{
                borderColor: type.color,
                backgroundColor: isVisible ? type.color : 'transparent',
              }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: type.color }}
            />
            <Label
              className={cn(
                "text-xs cursor-pointer select-none transition-opacity",
                !isVisible && "opacity-50 line-through"
              )}
            >
              {type.name}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
