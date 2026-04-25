import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BENEFIT_CATEGORIES } from "@/types/benefits";
import { useState } from "react";
import { useBenefitDestinations } from "@/components/benefits/DestinationCombobox";

interface BenefitFiltersProps {
  selectedCategory: string | null;
  selectedDestination: string | null;
  onCategoryChange: (cat: string | null) => void;
  onDestinationChange: (dest: string | null) => void;
}

export function BenefitFilters({ selectedCategory, selectedDestination, onCategoryChange, onDestinationChange }: BenefitFiltersProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const { data: destinations = [] } = useBenefitDestinations();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => { setCategoryOpen(!categoryOpen); setDestinationOpen(false); }}
        >
          Tipo de benefício
          {selectedCategory && (
            <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs rounded-full">1</Badge>
          )}
          {categoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => { setDestinationOpen(!destinationOpen); setCategoryOpen(false); }}
        >
          Destino
          {selectedDestination && (
            <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs rounded-full">1</Badge>
          )}
          {destinationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {categoryOpen && (
        <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
          <Badge variant={selectedCategory === null ? "default" : "outline"} className="cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => onCategoryChange(null)}>Todos</Badge>
          {BENEFIT_CATEGORIES.map((cat) => (
            <Badge key={cat.value} variant={selectedCategory === cat.value ? "default" : "outline"} className="cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => onCategoryChange(selectedCategory === cat.value ? null : cat.value)}>{cat.label}</Badge>
          ))}
        </div>
      )}

      {destinationOpen && (
        <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
          <Badge variant={selectedDestination === null ? "default" : "outline"} className="cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => onDestinationChange(null)}>Todos</Badge>
          {destinations.length === 0 && (
            <span className="text-xs text-muted-foreground py-1">Nenhum destino cadastrado ainda.</span>
          )}
          {destinations.map((dest) => (
            <Badge key={dest} variant={selectedDestination === dest ? "default" : "outline"} className="cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => onDestinationChange(selectedDestination === dest ? null : dest)}>{dest}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
