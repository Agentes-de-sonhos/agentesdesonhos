import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AdvisorSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  destinations: string[];
  icon: React.ReactNode;
  placeholder?: string;
}

export function AdvisorSearchBar({ value, onChange, destinations, icon, placeholder = "Buscar por cidade, destino ou país..." }: AdvisorSearchBarProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-3 bg-card rounded-2xl shadow-lg border border-border/50 px-5 py-3 transition-shadow focus-within:shadow-xl focus-within:border-primary/30">
        {icon}
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/60 h-auto p-0"
        />
        <div className="bg-primary text-primary-foreground rounded-xl p-2.5 shrink-0 cursor-pointer hover:bg-primary/90 transition-colors">
          <Search className="h-4 w-4" />
        </div>
      </div>
      {destinations.length > 0 && !value && (
        <div className="flex flex-wrap gap-2 mt-3">
          {destinations.slice(0, 8).map((dest) => (
            <button
              key={dest}
              onClick={() => onChange(dest)}
              className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
            >
              {dest}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
