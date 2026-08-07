import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuoteStepCardProps {
  step: number;
  id: string;
  title: string;
  hint: string;
  /** tailwind classes for the accent (bg-*) */
  accentClass: string;
  icon?: ReactNode;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function QuoteStepCard({
  step, id, title, hint, accentClass, icon, badge, open, onToggle, children,
}: QuoteStepCardProps) {
  const panelId = `${id}-panel`;
  return (
    <Card id={id} className="shadow-card scroll-mt-24">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={cn(
              "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white",
              accentClass
            )}
            aria-hidden="true"
          >
            {step}
          </span>
          <div className="min-w-0">
            <div className="w-fit">
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                {icon}
                {title}
                {badge}
              </h2>
              <div className={cn("mt-2 h-1 w-full rounded-full", accentClass)} />
            </div>
            {!open && (
              <p className="text-xs text-muted-foreground mt-2">{hint}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 mt-1 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <CardContent id={panelId} className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
