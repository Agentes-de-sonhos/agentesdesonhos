import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Lock, Map, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type WalletSettingsStep = "initial" | "access" | "itinerary" | "advanced";

const STEPS = [
  { key: "initial", short: "Inicial", title: "Configuração inicial", description: "Confira os dados principais e personalize a capa da carteira.", icon: ClipboardCheck, accent: "bg-sky-500", active: "border-sky-500 bg-sky-500 text-primary-foreground" },
  { key: "access", short: "Acesso", title: "Acesso do cliente", description: "Gerencie senha, link público e ações de compartilhamento.", icon: Lock, accent: "bg-violet-500", active: "border-violet-500 bg-violet-500 text-primary-foreground" },
  { key: "itinerary", short: "Roteiro", title: "Roteiro dia a dia", description: "Vincule, troque ou abra o roteiro desta carteira.", icon: Map, accent: "bg-amber-500", active: "border-amber-500 bg-amber-500 text-amber-950" },
  { key: "advanced", short: "Avançado", title: "Configurações avançadas", description: "Escolha quem aparece como responsável pela carteira.", icon: Settings2, accent: "bg-rose-500", active: "border-rose-500 bg-rose-500 text-primary-foreground" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: WalletSettingsStep;
  renderInitial: () => ReactNode;
  renderAccess: () => ReactNode;
  renderItinerary: () => ReactNode;
  renderAdvanced: () => ReactNode;
}

export function WalletSettingsModal({ open, onOpenChange, initialStep = "initial", renderInitial, renderAccess, renderItinerary, renderAdvanced }: Props) {
  const [active, setActive] = useState<WalletSettingsStep>(initialStep);
  useEffect(() => { if (open) setActive(initialStep); }, [initialStep, open]);
  const index = STEPS.findIndex((step) => step.key === active);
  const current = STEPS[index];
  const CurrentIcon = current.icon;
  const content: Record<WalletSettingsStep, ReactNode> = {
    initial: renderInitial(), access: renderAccess(), itinerary: renderItinerary(), advanced: renderAdvanced(),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,900px)] max-h-[calc(100vh-32px)] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b px-4 pb-4 pt-5 sm:px-6">
          <DialogTitle className="text-base sm:text-lg">Configurações da Carteira Digital</DialogTitle>
          <DialogDescription className="text-xs">Quatro passos para definir os dados e a experiência do cliente.</DialogDescription>
        </DialogHeader>
        <nav aria-label="Passos das configurações da carteira" className="shrink-0 overflow-x-auto overflow-y-hidden border-b bg-muted/30 px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
          <ol className="mx-auto flex w-max items-center gap-1.5">
            {STEPS.map((step, stepIndex) => {
              const selected = step.key === active;
              const done = stepIndex < index;
              return (
                <li key={step.key} className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActive(step.key)}
                    aria-current={selected ? "step" : undefined}
                    className={cn("h-auto whitespace-nowrap rounded-full px-2.5 py-1 text-xs", selected ? step.active : done ? "border-primary/30 text-primary" : "text-muted-foreground")}
                  >
                    <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold", selected ? "bg-background/20" : "bg-muted")}>
                      {done ? <Check className="h-2.5 w-2.5" /> : stepIndex + 1}
                    </span>
                    {step.short}
                  </Button>
                  {stepIndex < STEPS.length - 1 && <span className="h-px w-3 bg-border" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-muted/20 px-4 py-5 sm:px-6">
          <header className="mb-5 min-w-0">
            <div className="w-fit max-w-full">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold sm:text-base"><CurrentIcon className="h-4 w-4 shrink-0" />{current.title}</h3>
              <div className={cn("mt-2 h-1 w-full rounded-full", current.accent)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{current.description}</p>
          </header>
          {content[active]}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-background px-4 py-3 sm:px-6">
          <Button variant="ghost" size="sm" onClick={() => setActive(STEPS[Math.max(0, index - 1)].key)} disabled={index === 0}><ChevronLeft className="mr-1 h-4 w-4" />Voltar</Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">Passo {index + 1} de 4 — alterações são salvas automaticamente.</span>
          {index === STEPS.length - 1
            ? <Button size="sm" onClick={() => onOpenChange(false)}>Concluir</Button>
            : <Button size="sm" onClick={() => setActive(STEPS[index + 1].key)}>Avançar<ChevronRight className="ml-1 h-4 w-4" /></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}