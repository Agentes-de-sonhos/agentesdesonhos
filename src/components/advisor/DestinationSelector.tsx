import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface DestinationSelectorProps {
  destinations: string[];
  selected: string;
  onSelect: (destination: string) => void;
}

export function DestinationSelector({ destinations, selected, onSelect }: DestinationSelectorProps) {
  const allDestinations = destinations.length > 0 ? destinations : [];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button
        onClick={() => onSelect("")}
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200",
          !selected
            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
            : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
        )}
      >
        <MapPin className="h-4 w-4" />
        Todos os destinos
      </button>
      {allDestinations.map((dest) => (
        <button
          key={dest}
          onClick={() => onSelect(selected === dest ? "" : dest)}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200",
            selected === dest
              ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
              : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
          )}
        >
          <MapPin className="h-4 w-4" />
          {dest}
        </button>
      ))}
    </div>
  );
}
