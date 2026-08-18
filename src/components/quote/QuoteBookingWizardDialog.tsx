import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Layers,
  LayoutGrid,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import { serviceCompactDigest, serviceDigestDateSummary } from "@/lib/quoteServiceDigest";
import { ServiceDigestCompact } from "@/components/quote/ServiceDigestCompact";
import {
  applyBookingDecision,
  bookingWizardCountsLabel,
  bookingWizardDecisionCounts,
  bookingWizardProgress,
  clampStepIndex,
  firstPendingStepIndex,
  isLastStepIndex,
  nextStepIndex,
  previousStepIndex,
  stepProgressLabel,
  type BookingDecisionMap,
  type BookingWizardStep,
} from "@/lib/quoteBookingWizard";
import type { QuoteService } from "@/types/quote";
import { cn } from "@/lib/utils";

type WizardMode = "flow" | "all" | "review";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: BookingWizardStep[];
  decisions: BookingDecisionMap;
  onDecisionsChange: (decisions: BookingDecisionMap) => void;
  /** Serviços já incluídos na proposta (não entram na decisão). */
  includedServices: QuoteService[];
  /** Formata valores conforme a moeda do orçamento. */
  formatAmount: (value: number) => string;
  /** true quando o orçamento não mostra valores por serviço. */
  hideAmounts: boolean;
  totalLabel: string;
  selectedTotal: number | null;
  /** Dispara o envio da solicitação (o modal apenas registra escolhas). */
  onRequest: () => void;
  /** Bloqueio informado pelas regras de seleção (ex.: bloco obrigatório). */
  selectionError?: string | null;
  /** Passo inicial: "review" abre direto no resumo final. */
  startAt?: WizardMode;
}

function ServiceStepCard({
  step,
  hideAmounts,
  formatAmount,
}: {
  step: BookingWizardStep;
  hideAmounts: boolean;
  formatAmount: (v: number) => string;
}) {
  const service = step.service;
  const digest = serviceCompactDigest(service);
  const amount = Number((service as any).amount) || 0;

  return (
    <div className="w-full min-w-0 max-w-full space-y-3">
      {digest.images.length > 0 && (
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl">
          <ServiceImageCarousel
            images={digest.images}
            alt={digest.title}
            disableExpand
            placeId={resolveServicePlaceId(service)}
          />
        </div>
      )}

      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          {digest.typeLabel}
        </p>
        <h3 className="break-words text-lg font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-xl">
          {digest.title}
        </h3>
        {digest.location && (
          <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {digest.location}
          </p>
        )}
      </div>

      {(digest.dateLines.length > 0 || digest.quantity) && (
        <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {digest.dateLines.map((line) => (
            <div
              key={line.label}
              className="min-w-0 rounded-xl border border-border/50 bg-muted/30 px-3 py-2"
            >
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {line.label}
              </dt>
              <dd className="mt-0.5 break-words text-sm font-medium text-foreground">
                {line.value}
              </dd>
            </div>
          ))}
          {digest.quantity && (
            <div className="min-w-0 rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Quantidade
              </dt>
              <dd className="mt-0.5 break-words text-sm font-medium text-foreground">
                {digest.quantity}
              </dd>
            </div>
          )}
        </dl>
      )}

      {digest.shortDescription && (
        <p className="line-clamp-3 break-words rounded-xl border-l-2 border-primary/40 bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
          {digest.shortDescription}
        </p>
      )}

      {!hideAmounts && amount > 0 && (
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Valor deste serviço
          </span>
          <span className="break-words text-lg font-bold text-foreground">{formatAmount(amount)}</span>
        </div>
      )}
    </div>
  );
}

export function QuoteBookingWizardDialog({
  open,
  onOpenChange,
  steps,
  decisions,
  onDecisionsChange,
  includedServices,
  formatAmount,
  hideAmounts,
  totalLabel,
  selectedTotal,
  onRequest,
  selectionError,
  startAt = "flow",
}: Props) {
  const progress = bookingWizardProgress(steps, decisions);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"flow" | "review">(startAt);
  // Transição leve e discreta ao trocar de serviço.
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setMode(startAt);
    const pending = firstPendingStepIndex(steps, decisions);
    setIndex(pending >= 0 ? pending : Math.max(0, steps.length - 1));
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startAt]);

  const step = steps[index];
  const decided = step ? decisions[step.serviceId] : undefined;

  const selectedSteps = useMemo(
    () => steps.filter((s) => decisions[s.serviceId] === "yes"),
    [steps, decisions],
  );

  const goTo = (nextIndex: number) => {
    setIndex(Math.max(0, Math.min(steps.length - 1, nextIndex)));
    setAnimKey((k) => k + 1);
  };

  const decide = (decision: "yes" | "no") => {
    if (!step) return;
    const next = applyBookingDecision(steps, decisions, step.serviceId, decision);
    onDecisionsChange(next);
    const pending = firstPendingStepIndex(steps, next, index + 1);
    if (pending >= 0) {
      goTo(pending);
      return;
    }
    setMode("review");
    setAnimKey((k) => k + 1);
  };

  const editChoices = () => {
    setMode("flow");
    goTo(0);
  };

  const includedCount = includedServices.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="box-border flex max-h-[92dvh] w-[95vw] min-w-0 max-w-[min(560px,95vw)] flex-col gap-0 overflow-x-hidden overflow-y-hidden p-0">
        {/* Cabeçalho: progresso e contexto */}
        <div className="shrink-0 border-b border-border/50 bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-bold tracking-tight sm:text-base">
                {mode === "review" ? "Revise o que você escolheu" : "Escolha o que deseja reservar"}
              </DialogTitle>
              <p className="mt-0.5 break-words text-[11px] font-medium text-muted-foreground">
                {mode === "review"
                  ? `${selectedSteps.length} serviço(s) escolhido(s) de ${steps.length}`
                  : [stepProgressLabel(step, steps.length), step?.sectionTitle, step?.blockTitle]
                      .filter(Boolean)
                      .join(" • ")}
              </p>
            </div>
            <span className="w-8 shrink-0" aria-hidden />
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${steps.length ? Math.round((progress.decided / steps.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Corpo */}
        <div key={animKey} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 animate-fade-up sm:px-5">
          {mode === "flow" && step && (
            <div className="space-y-4">
              {step.blockTitle && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{step.blockTitle}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {step.groupType === "alternative" ? "Escolha 1 opção" : "Escolha as que quiser"}
                  </Badge>
                </div>
              )}

              <ServiceStepCard step={step} hideAmounts={hideAmounts} formatAmount={formatAmount} />

              {decided && (
                <p
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                    decided === "yes"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {decided === "yes" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  {decided === "yes"
                    ? "Você escolheu reservar este serviço."
                    : "Você marcou que não quer este serviço."}
                </p>
              )}
            </div>
          )}

          {mode === "review" && (
            <div className="space-y-4">
              {selectedSteps.length === 0 && includedCount === 0 ? (
                <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-primary" />
                  <p className="text-sm font-semibold">Você ainda não escolheu nenhum serviço</p>
                  <p className="text-sm text-muted-foreground">
                    Sem problema: volte e escolha com calma o que faz sentido para a sua viagem.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {includedServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex w-full min-w-0 max-w-full flex-wrap items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <ServiceDigestCompact service={service} withThumb />
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary/80">
                          Já incluído na proposta
                        </p>
                      </div>
                      {!hideAmounts && Number((service as any).amount) > 0 && (
                        <span className="shrink-0 break-words text-sm font-semibold">
                          {formatAmount(Number((service as any).amount))}
                        </span>
                      )}
                    </div>
                  ))}

                  {selectedSteps.map((s) => {
                    const amount = Number((s.service as any).amount) || 0;
                    return (
                      <div
                        key={s.serviceId}
                        className="flex w-full min-w-0 max-w-full flex-wrap items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div className="min-w-0 flex-1">
                          <ServiceDigestCompact service={s.service} withThumb />
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-[11px] font-semibold"
                            onClick={() => {
                              setMode("flow");
                              goTo(steps.findIndex((x) => x.serviceId === s.serviceId));
                            }}
                          >
                            <Pencil className="mr-1 h-3 w-3" /> Alterar esta escolha
                          </Button>
                        </div>
                        {!hideAmounts && amount > 0 && (
                          <span className="ml-auto break-words text-sm font-semibold">
                            {formatAmount(amount)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-2xl border border-border/50 bg-muted/30 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {totalLabel}
                  </span>
                  <span className="text-lg font-bold">
                    {selectedTotal != null ? formatAmount(selectedTotal) : "A confirmar com a agência"}
                  </span>
                </div>
                <p className="mt-2 flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Escolher um serviço não envia o pedido. A solicitação só é enviada quando você
                    tocar em “Solicitar reserva”.
                  </span>
                </p>
              </div>

              {selectionError && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {selectionError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="min-w-0 shrink-0 border-t border-border/50 bg-card px-4 py-3 sm:px-5">
          {mode === "flow" ? (
            <div className="min-w-0 space-y-2">
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full gap-2 text-base"
                  onClick={() => decide("yes")}
                >
                  <Check className="h-4 w-4" /> Quero reservar
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-12 w-full gap-2 text-base"
                  onClick={() => decide("no")}
                >
                  <X className="h-4 w-4" /> Não quero este serviço
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => goTo(index - 1)}
                  disabled={index === 0}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setMode("review");
                    setAnimKey((k) => k + 1);
                  }}
                >
                  Ver resumo <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full gap-2 text-base"
                onClick={onRequest}
                disabled={selectedSteps.length === 0 && includedCount === 0}
              >
                <CheckCircle2 className="h-4 w-4" /> Solicitar reserva dos serviços selecionados
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={editChoices}
              >
                <Pencil className="h-4 w-4" /> Editar escolhas
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}