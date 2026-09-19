import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface QuoteStepMeta {
  step: number;
  short: string;
  hint: string;
  accentClass: string;
}

interface Props {
  steps: QuoteStepMeta[];
  actions?: ReactNode;
  ariaLabel?: string;
}

function ExplanatoryStep({
  step,
  open,
  onToggle,
  onDismiss,
}: {
  step: QuoteStepMeta;
  open: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onDismiss();
    }}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${step.short}: ${step.hint}`}
          aria-expanded={open}
          onClick={onToggle}
          className="h-8 w-full min-w-0 gap-1 rounded-full px-1.5 text-[10px] font-medium text-muted-foreground hover:bg-background hover:text-muted-foreground sm:gap-1.5 sm:px-2 sm:text-[11px] xl:gap-2 xl:px-2.5 xl:text-xs"
        >
          <span className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-primary-foreground sm:h-5 sm:w-5 sm:text-[10px]", step.accentClass)}>
            {step.step}
          </span>
          <span className="min-w-0 truncate whitespace-nowrap">{step.short}</span>
        </Button>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] p-3"
      >
        <p className="text-sm font-medium text-foreground">{step.short}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.hint}</p>
      </PopoverContent>
    </Popover>
  );
}

export function QuoteStepsGuide({ steps, actions, ariaLabel = "Etapas do orçamento" }: Props) {
  const [openStep, setOpenStep] = useState<number | null>(null);

  return (
    <div className="my-1 flex w-full min-w-0 flex-col gap-2 md:flex-row md:items-center">
      <nav aria-label={ariaLabel} className="min-w-0 flex-1">
        <ol className={cn("grid min-w-0 grid-cols-2 items-center gap-1 xl:gap-2", steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
          {steps.map((step) => (
            <li key={step.step} className="min-w-0">
              <ExplanatoryStep
                step={step}
                open={openStep === step.step}
                onToggle={() => setOpenStep((current) => current === step.step ? null : step.step)}
                onDismiss={() => setOpenStep((current) => current === step.step ? null : current)}
              />
            </li>
          ))}
        </ol>
      </nav>
      {actions && <div className="flex shrink-0 items-center justify-end gap-1.5 xl:gap-2">{actions}</div>}
    </div>
  );
}
