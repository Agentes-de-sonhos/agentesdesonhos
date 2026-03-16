import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleFormSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleFormSection({ title, children, defaultOpen = false }: CollapsibleFormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">{title}</h4>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
