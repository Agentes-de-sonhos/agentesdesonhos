import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
}

function ExplanatoryStep({ step }: { step: QuoteStepMeta }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${step.short}: ${step.hint}`}
          className="h-8 shrink-0 gap-2 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-primary-foreground", step.accentClass)}>
            {step.step}
          </span>
          <span className="whitespace-nowrap">{step.short}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] p-3"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="text-sm font-medium text-foreground">{step.short}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.hint}</p>
      </PopoverContent>
    </Popover>
  );
}

export function QuoteStepsGuide({ steps, actions }: Props) {
  return (
    <div className="my-1 flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label="Etapas do orçamento" className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex w-max items-center gap-x-2">
          {steps.map((step, index) => (
            <li key={step.step} className="flex items-center gap-2">
              <ExplanatoryStep step={step} />
              {index < steps.length - 1 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </nav>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </div>
  );
}
