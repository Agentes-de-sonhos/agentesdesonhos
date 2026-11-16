import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
}

/** No celular começa recolhido; em telas maiores sempre aberto. */
export function MobileCollapsibleSection({ title, icon: Icon, iconClassName, children }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  if (!isMobile) return <>{children}</>;
  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-md">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-14 w-full items-center gap-2 p-4 text-left"
        >
          <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} />
          <span className="flex-1 font-display text-base font-semibold text-foreground">{title}</span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </Card>
      {open && children}
    </div>
  );
}
