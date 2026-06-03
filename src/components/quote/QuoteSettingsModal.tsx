import { useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin, CreditCard, CalendarIcon, Paperclip, ChevronLeft, ChevronRight, Check, ListChecks, Settings2 } from "lucide-react";

export type QuoteSettingsStep = "destination" | "included" | "payment" | "validity" | "documents" | "advanced";

interface StepDef {
  key: QuoteSettingsStep;
  title: string;
  icon: typeof MapPin;
}

const STEPS: StepDef[] = [
  { key: "destination", title: "Apresentação do Destino", icon: MapPin },
  { key: "included",    title: "O que está incluso", icon: ListChecks },
  { key: "payment",     title: "Apresentação do Investimento", icon: CreditCard },
  { key: "validity",    title: "Validade e Termos", icon: CalendarIcon },
  { key: "documents",   title: "Documentos do Orçamento", icon: Paperclip },
  { key: "advanced",    title: "Configurações Avançadas", icon: Settings2 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: QuoteSettingsStep;
  onBeforeNavigate?: () => Promise<void> | void;
  renderDestination: () => ReactNode;
  renderIncluded: () => ReactNode;
  renderPayment: () => ReactNode;
  renderValidity: () => ReactNode;
  renderDocuments: () => ReactNode;
  renderAdvanced: () => ReactNode;
}

export function QuoteSettingsModal({
  open, onOpenChange, initialStep = "destination", onBeforeNavigate,
  renderDestination, renderIncluded, renderPayment, renderValidity, renderDocuments, renderAdvanced,
}: Props) {
  const [active, setActive] = useState<QuoteSettingsStep>(initialStep);
  const idx = STEPS.findIndex(s => s.key === active);
  const isFirst = idx === 0;
  const isLast = idx === STEPS.length - 1;

  const goToStep = async (key: QuoteSettingsStep) => {
    try { await onBeforeNavigate?.(); } catch { /* noop */ }
    setActive(key);
  };

  const handleClose = async (next: boolean) => {
    if (!next) {
      try { await onBeforeNavigate?.(); } catch { /* noop */ }
    }
    onOpenChange(next);
  };

  const content: Record<QuoteSettingsStep, ReactNode> = {
    destination: renderDestination(),
    included: renderIncluded(),
    payment: renderPayment(),
    validity: renderValidity(),
    documents: renderDocuments(),
    advanced: renderAdvanced(),
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[calc(100vh-48px)] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Configurações do Orçamento</DialogTitle>
          <DialogDescription>
            Personalize a apresentação do destino, condições, validade e documentos em etapas.
          </DialogDescription>
        </DialogHeader>

        {/* Step tabs */}
        <div className="border-b bg-muted/30 px-3 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = s.key === active;
              const isDone = i < idx;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => goToStep(s.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : isDone
                      ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <span className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    isActive ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
                    {isDone ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {content[active]}
        </div>

        <div className="border-t bg-background px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(STEPS[Math.max(0, idx - 1)].key)}
            disabled={isFirst}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Etapa {idx + 1} de {STEPS.length} — você pode pular e voltar a qualquer momento. Alterações são salvas automaticamente.
          </span>
          {isLast ? (
            <Button size="sm" onClick={() => handleClose(false)}>
              Concluir
            </Button>
          ) : (
            <Button size="sm" onClick={() => goToStep(STEPS[Math.min(STEPS.length - 1, idx + 1)].key)}>
              Avançar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}