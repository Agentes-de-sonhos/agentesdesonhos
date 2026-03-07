import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface DestinationSelectorProps {
  destinations: string[];
  selected: string;
  onSelect: (destination: string) => void;
}

export function DestinationSelector({ destinations, selected, onSelect }: DestinationSelectorProps) {
  const allDestinations = destinations.length > 0 ? destinations : [];

  if (allDestinations.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {allDestinations.map((dest) => (
        <button
          key={dest}
          onClick={() => onSelect(selected === dest ? "" : dest)}
          className={cn(
            "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-base font-semibold border-2 transition-all duration-200",
            selected === dest || (!selected && allDestinations.length === 1)
              ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
              : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
          )}
        >
          <MapPin className="h-5 w-5" />
          {dest}
        </button>
      ))}
    </div>
  );
}
