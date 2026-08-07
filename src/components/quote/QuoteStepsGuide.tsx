import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuoteStepMeta {
  step: number;
  short: string;
  hint: string;
  accentClass: string;
}

interface Props {
  steps: QuoteStepMeta[];
  onSelect: (step: number) => void;
}

export function QuoteStepsGuide({ steps, onSelect }: Props) {
  const [showHints, setShowHints] = useState(false);

  return (
    <Card className="shadow-card">
      <CardContent className="px-5 sm:px-6 py-5 space-y-4">
        <div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground">
            Monte seu orçamento em 5 etapas
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Abra uma etapa por vez. Você pode revisar e editar tudo antes de enviar.
          </p>
        </div>

        <nav aria-label="Etapas do orçamento">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {steps.map((s, i) => (
              <li key={s.step} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(s.step)}
                  className="group flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white", s.accentClass)}>
                    {s.step}
                  </span>
                  <span className="whitespace-nowrap">{s.short}</span>
                </button>
                {i < steps.length - 1 && (
                  <span className="hidden sm:block h-px w-4 bg-border" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div>
          <button
            type="button"
            onClick={() => setShowHints((v) => !v)}
            aria-expanded={showHints}
            aria-controls="quote-steps-hints"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {showHints ? "Ocultar orientações" : "Ver orientações"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showHints && "rotate-180")} />
          </button>
          {showHints && (
            <ol id="quote-steps-hints" className="mt-3 space-y-2">
              {steps.map((s) => (
                <li key={s.step} className="flex items-start gap-2 text-xs">
                  <span className={cn("mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white", s.accentClass)}>
                    {s.step}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{s.short}</span>
                    <span className="text-muted-foreground"> — {s.hint}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
