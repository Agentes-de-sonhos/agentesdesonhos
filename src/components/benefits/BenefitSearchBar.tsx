import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BenefitSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function BenefitSearchBar({ value, onChange }: BenefitSearchBarProps) {
  return (
    <div className="flex items-center gap-3 bg-card rounded-2xl shadow-lg border border-border/50 px-5 py-3 transition-shadow focus-within:shadow-xl focus-within:border-primary/30">
      <Search className="h-5 w-5 text-muted-foreground shrink-0" />
      <Input
        type="text"
        placeholder="Buscar por destino, empresa, hotel, atração ou palavra-chave..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/60 h-auto p-0"
      />
    </div>
  );
}
