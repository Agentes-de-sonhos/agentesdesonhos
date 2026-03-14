import { Badge } from "@/components/ui/badge";
import { BENEFIT_CATEGORIES, BENEFIT_DESTINATIONS } from "@/types/benefits";

interface BenefitFiltersProps {
  selectedCategory: string | null;
  selectedDestination: string | null;
  onCategoryChange: (cat: string | null) => void;
  onDestinationChange: (dest: string | null) => void;
}

export function BenefitFilters({ selectedCategory, selectedDestination, onCategoryChange, onDestinationChange }: BenefitFiltersProps) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}
