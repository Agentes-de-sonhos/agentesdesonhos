import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { BENEFIT_CATEGORIES, BENEFIT_DESTINATIONS } from "@/types/benefits";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BenefitFiltersProps {
  selectedCategory: string | null;
  selectedDestination: string | null;
  onCategoryChange: (cat: string | null) => void;
  onDestinationChange: (dest: string | null) => void;
}

export function BenefitFilters({ selectedCategory, selectedDestination, onCategoryChange, onDestinationChange }: BenefitFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount = (selectedCategory ? 1 : 0) + (selectedDestination ? 1 : 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {activeCount}
            </Badge>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Tipo de benefício</p>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => onCategoryChange(null)}
            >
              Todos
            </Badge>
            {BENEFIT_CATEGORIES.map((cat) => (
              <Badge
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => onCategoryChange(selectedCategory === cat.value ? null : cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Destino</p>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedDestination === null ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => onDestinationChange(null)}
            >
              Todos
            </Badge>
            {BENEFIT_DESTINATIONS.map((dest) => (
              <Badge
                key={dest}
                variant={selectedDestination === dest ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => onDestinationChange(selectedDestination === dest ? null : dest)}
              >
                {dest}
              </Badge>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
