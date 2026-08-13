import { useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin, CreditCard, CalendarIcon, Paperclip, ChevronLeft, ChevronRight, Check, ListChecks, Settings2 } from "lucide-react";

export type QuoteSettingsStep = "destination" | "included" | "payment" | "validity" | "documents" | "advanced";

interface StepDef {
  key: QuoteSettingsStep;
  title: string;
  /** Short label used in the compact stepper */
  short: string;
  description: string;
  icon: typeof MapPin;
}

const STEPS: StepDef[] = [
  {
    key: "destination",
    title: "Apresentação do destino",
    short: "Destino",
    description: "Escolha a capa, as fotos e o texto que abrem o orçamento do cliente.",
    icon: MapPin,
  },
  {
    key: "included",
    title: "O que está incluso",
    short: "Incluso",
    description: "Revise a lista de itens que o cliente verá como incluídos na viagem.",
    icon: ListChecks,
  },
  {
    key: "payment",
    title: "Apresentação do investimento",
    short: "Investimento",
    description: "Defina como os valores e as condições de pagamento aparecem para o cliente.",
    icon: CreditCard,
  },
  {
    key: "validity",
    title: "Validade e termos",
    short: "Validade",
    description: "Informe até quando a proposta é válida e os termos que a acompanham.",
    icon: CalendarIcon,
  },
  {
    key: "documents",
    title: "Documentos do orçamento",
    short: "Documentos",
    description: "Anexe arquivos de apoio e escolha quais ficam visíveis no link público.",
    icon: Paperclip,
  },
  {
    key: "advanced",
    title: "Configurações avançadas",
    short: "Avançado",
    description: "Moeda do orçamento e opções adicionais de solicitação de reserva.",
    icon: Settings2,
  },
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
  /** Optional compact action rendered at the right of the contextual step header. */
  stepHeaderActions?: Partial<Record<QuoteSettingsStep, ReactNode>>;
}

export function QuoteSettingsModal({
  open, onOpenChange, initialStep = "destination", onBeforeNavigate,
  renderDestination, renderIncluded, renderPayment, renderValidity, renderDocuments, renderAdvanced,
  stepHeaderActions,
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

  const current = STEPS[idx];
  const CurrentIcon = current.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[calc(100vh-48px)] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b space-y-0">
          <DialogTitle className="text-base sm:text-lg">Configurações do Orçamento</DialogTitle>
          <DialogDescription className="text-xs">
            Seis passos rápidos para definir como o cliente verá este orçamento.
          </DialogDescription>
        </DialogHeader>

        {/* Compact numbered stepper */}
        <nav
          aria-label="Passos das configurações"
          className="border-b bg-muted/30 px-3 sm:px-6 py-2.5 overflow-x-auto"
        >
          <ol className="flex w-max items-center gap-1.5 mx-auto">
            {STEPS.map((s, i) => {
              const isActive = s.key === active;
              const isDone = i < idx;
              return (
                <li key={s.key} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToStep(s.key)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : isDone
                        ? "border-primary/30 bg-background text-primary hover:bg-primary/5"
                        : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                        isActive ? "bg-primary-foreground/25" : isDone ? "bg-primary/10" : "bg-muted"
                      )}
                    >
                      {isDone ? <Check className="h-2.5 w-2.5" /> : i + 1}
                    </span>
                    <span>{s.short}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span className="h-px w-3 bg-border" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex-1 overflow-y-auto bg-muted/20 px-4 sm:px-6 py-5">
          <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CurrentIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">
                  {current.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{current.description}</p>
              </div>
            </div>
            {stepHeaderActions?.[active] && (
              <div className="shrink-0 sm:pt-1">{stepHeaderActions[active]}</div>
            )}
          </header>
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
            Passo {idx + 1} de {STEPS.length} — alterações são salvas automaticamente.
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