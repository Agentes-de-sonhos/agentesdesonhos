import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section accordion used on the public quote link. Starts collapsed and shows
 * the section name plus the number of services it contains.
 */
export function PublicSectionAccordion({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Layers className="h-4 w-4 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground truncate">{title}</span>
          <span className="block text-xs text-muted-foreground">
            {count} {count === 1 ? "serviço" : "serviços"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="px-3 sm:px-4 pb-4">{children}</div>}
    </div>
  );
}
