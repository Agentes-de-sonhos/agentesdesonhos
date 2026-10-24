import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Torna recolhível um card existente (Card > CardHeader + conteúdo) sem
 * duplicar o título: o cabeçalho do card continua visível e o restante
 * some quando fechado. A seta fica no canto superior direito.
 */
export function CollapsibleSettingsCard({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        "relative [&>div>div:first-child]:pr-14",
        !open && "[&>div>div:not(:first-child)]:hidden",
      )}
    >
      {children}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? `Recolher ${title}` : `Expandir ${title}`}
        className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
