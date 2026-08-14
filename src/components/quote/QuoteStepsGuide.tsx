import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle, Globe, Share2, FileText } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav aria-label="Etapas do orçamento" className="my-1 -mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex w-max items-center gap-x-2">
          {steps.map((s, i) => (
            <li key={s.step} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(s.step)}
                className="group flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white", s.accentClass)}>
                  {s.step}
                </span>
                <span className="whitespace-nowrap">{s.short}</span>
              </button>
              {i < steps.length - 1 && (
                <span className="h-px w-4 bg-border" aria-hidden="true" />
              )}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="h-px w-4 bg-border" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ver mais sobre como montar seu orçamento"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap">Ver mais</span>
            </button>
          </li>
        </ol>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden bg-background p-0 md:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-background px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-base font-semibold text-foreground sm:text-lg">Como montar seu orçamento</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Abra uma etapa por vez. Você pode revisar e editar tudo antes de enviar.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background px-5 py-4 sm:px-6">
              <ol className="space-y-2.5">
                {steps.map((s) => (
                  <li key={s.step} className="flex items-start gap-2 text-xs sm:text-[13px]">
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

              <section
                aria-labelledby="quote-after-steps-title"
                className="rounded-xl border border-border bg-background p-3 sm:p-4"
              >
                <h3
                  id="quote-after-steps-title"
                  className="font-display text-sm font-semibold text-foreground"
                >
                  Depois das 5 etapas: publique e compartilhe
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quando terminar a revisão, escolha como deseja apresentar o orçamento ao cliente:
                </p>

                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <li className="flex h-full items-start gap-2.5 rounded-lg border border-border/70 bg-muted/40 p-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-foreground sm:whitespace-nowrap">
                        Gerar orçamento web
                      </span>
                      <span className="block text-[11px] leading-4 text-muted-foreground">
                        Cria a versão online e um link público exclusivo.
                      </span>
                    </div>
                  </li>
                  <li className="flex h-full items-start gap-2.5 rounded-lg border border-border/70 bg-muted/40 p-3">
                    <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-foreground sm:whitespace-nowrap">
                        Compartilhar
                      </span>
                      <span className="block text-[11px] leading-4 text-muted-foreground">
                        Copie somente o link ou uma mensagem pronta, personalizada com o resumo do orçamento e o link de acesso.
                      </span>
                    </div>
                  </li>
                  <li className="flex h-full items-start gap-2.5 rounded-lg border border-border/70 bg-muted/40 p-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-foreground sm:whitespace-nowrap">
                        Gerar orçamento PDF
                      </span>
                      <span className="block text-[11px] leading-4 text-muted-foreground">
                        Cria uma versão em PDF para baixar e enviar.
                      </span>
                    </div>
                  </li>
                </ul>

                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Essas ações estão nos botões <span className="font-medium text-foreground">Gerar orçamento web</span> e <span className="font-medium text-foreground">Gerar orçamento PDF</span>, no topo da página.
                </p>
              </section>
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-5 py-3 sm:px-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
