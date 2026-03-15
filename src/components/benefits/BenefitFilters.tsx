import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BENEFIT_CATEGORIES, BENEFIT_DESTINATIONS } from "@/types/benefits";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface BenefitFiltersProps {
  selectedCategory: string | null;
  selectedDestination: string | null;
  onCategoryChange: (cat: string | null) => void;
  onDestinationChange: (dest: string | null) => void;
}

export function BenefitFilters({ selectedCategory, selectedDestination, onCategoryChange, onDestinationChange }: BenefitFiltersProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);

  return (
    <div className="flex items-start gap-3">
      <Collapsible open={categoryOpen} onOpenChange={setCategoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Tipo de benefício
            {selectedCategory && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs rounded-full">
                1
              </Badge>
            )}
            {categoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 animate-in slide-in-from-top-2 duration-200">
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
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={destinationOpen} onOpenChange={setDestinationOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Destino
            {selectedDestination && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs rounded-full">
                1
              </Badge>
            )}
            {destinationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 animate-in slide-in-from-top-2 duration-200">
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
