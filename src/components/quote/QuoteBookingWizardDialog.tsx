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

function StatusPill({ decision }: { decision?: "yes" | "no" }) {
  if (decision === "yes") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
        <Check className="h-3 w-3" aria-hidden="true" /> Selecionado para reserva
      </span>
    );
  }
  if (decision === "no") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
        <X className="h-3 w-3" aria-hidden="true" /> Não quero este serviço
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      <Clock className="h-3 w-3" aria-hidden="true" /> Ainda não avaliado
    </span>
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
  const counts = bookingWizardDecisionCounts(steps, decisions);
  const countsLabel = bookingWizardCountsLabel(counts);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<WizardMode>(startAt);
  // Transição leve e discreta ao trocar de serviço.
  const [animKey, setAnimKey] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  /** true quando o pop-up foi aberto já com decisões (sessão de edição). */
  const editingSession = useRef(false);

  useEffect(() => {
    if (!open) return;
    editingSession.current = Object.keys(decisions || {}).length > 0;
    setMode(startAt);
    const pending = firstPendingStepIndex(steps, decisions);
    setIndex(pending >= 0 ? pending : 0);
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startAt]);

  // Ao trocar de serviço/modo, o conteúdo rolável volta ao topo.
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [animKey]);

  const step = steps[index];
  const decided = step ? decisions[step.serviceId] : undefined;
  const lastStep = isLastStepIndex(steps, index);

  const selectedSteps = useMemo(
    () => steps.filter((s) => decisions[s.serviceId] === "yes"),
    [steps, decisions],
  );

  const goTo = (nextIndex: number, nextMode: WizardMode = "flow") => {
    setIndex(clampStepIndex(steps, nextIndex));
    setMode(nextMode);
    setAnimKey((k) => k + 1);
  };

  const showMode = (nextMode: WizardMode) => {
    setMode(nextMode);
    setAnimKey((k) => k + 1);
  };

  const decide = (decision: "yes" | "no") => {
    if (!step) return;
    const wasPending = !decisions[step.serviceId];
    const next = applyBookingDecision(steps, decisions, step.serviceId, decision);
    onDecisionsChange(next);

    // Sessão de edição: nunca fecha, nunca força o resumo, permanece no serviço.
    if (editingSession.current && !wasPending) return;

    const pending = firstPendingStepIndex(steps, next, index + 1);
    if (pending >= 0) {
      goTo(pending);
      return;
    }
    if (!editingSession.current) showMode("review");
  };

  const includedCount = includedServices.length;

  const headerTitle =
    mode === "review"
      ? "Revise o que você escolheu"
      : mode === "all"
        ? "Todos os serviços do orçamento"
        : "Escolha o que deseja reservar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="box-border flex max-h-[92dvh] w-[95vw] min-w-0 max-w-[min(560px,95vw)] flex-col gap-0 overflow-x-hidden overflow-y-hidden p-0">
        {/* Cabeçalho: progresso e contexto */}
        <div className="min-w-0 shrink-0 border-b border-border/50 bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-bold tracking-tight sm:text-base">
                {headerTitle}
              </DialogTitle>
              {mode === "flow" ? (
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px] font-bold"
                    onClick={() => showMode("all")}
                  >
                    <LayoutGrid className="h-3 w-3" aria-hidden="true" />
                    {stepProgressLabel(step, steps.length) || "Ver todos os serviços"}
                  </Button>
                  {[step?.sectionTitle, step?.blockTitle].filter(Boolean).length > 0 && (
                    <span className="min-w-0 break-words text-[11px] font-medium text-muted-foreground [overflow-wrap:anywhere]">
                      {[step?.sectionTitle, step?.blockTitle].filter(Boolean).join(" • ")}
                    </span>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-1 h-7 gap-1 px-2 text-[11px] font-bold"
                  onClick={() => showMode("all")}
                >
                  <LayoutGrid className="h-3 w-3" aria-hidden="true" /> Ver todos os serviços
                </Button>
              )}
              <p className="mt-1 break-words text-[11px] font-medium text-muted-foreground [overflow-wrap:anywhere]">
                {countsLabel}
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
        <div
          ref={bodyRef}
          key={animKey}
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 animate-fade-up sm:px-5"
        >
          {mode === "flow" && step && (
            <div className="min-w-0 space-y-4">
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

          {mode === "all" && (
            <ul className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              {steps.map((s, i) => {
                const digest = serviceCompactDigest(s.service);
                const dateSummary =
                  serviceDigestDateSummary(s.service) ||
                  digest.dateLines.map((l) => l.value).join(" • ") ||
                  null;
                const status = decisions[s.serviceId];
                const current = i === index;
                return (
                  <li key={s.serviceId} className="min-w-0">
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => goTo(i, "flow")}
                      className={cn(
                        "flex w-full min-w-0 flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        current ? "border-primary bg-primary/5" : "border-border/60 bg-card hover:bg-muted/40",
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Serviço {i + 1}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                        {digest.typeLabel}
                      </span>
                      <span className="w-full min-w-0 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                        {digest.title}
                      </span>
                      {dateSummary && (
                        <span className="w-full min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                          {dateSummary}
                        </span>
                      )}
                      <StatusPill decision={status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {mode === "review" && (
            <div className="min-w-0 space-y-4">
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
                            onClick={() => goTo(steps.findIndex((x) => x.serviceId === s.serviceId), "flow")}
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
          {mode === "flow" && (
            <div className="min-w-0 space-y-2">
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="lg"
                  aria-pressed={decided === "yes"}
                  variant={decided === "yes" ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-12 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center text-base leading-tight",
                    decided === "yes" && "ring-2 ring-primary ring-offset-2",
                  )}
                  onClick={() => decide("yes")}
                >
                  {decided === "yes" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                  Quero reservar
                </Button>
                <Button
                  type="button"
                  size="lg"
                  aria-pressed={decided === "no"}
                  variant={decided === "no" ? "secondary" : "outline"}
                  className={cn(
                    "h-auto min-h-12 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center text-base leading-tight",
                    decided === "no" && "ring-2 ring-destructive/60 ring-offset-2 text-destructive",
                  )}
                  onClick={() => decide("no")}
                >
                  <X className="h-4 w-4 shrink-0" /> Não quero este serviço
                </Button>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-10 w-full min-w-0 max-w-full gap-1 whitespace-normal py-2 text-center leading-tight"
                  onClick={() => goTo(previousStepIndex(steps, index), "flow")}
                  disabled={index === 0}
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" /> Serviço anterior
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-10 w-full min-w-0 max-w-full gap-1 whitespace-normal py-2 text-center leading-tight"
                  onClick={() => (lastStep ? showMode("review") : goTo(nextStepIndex(steps, index), "flow"))}
                >
                  {lastStep ? "Ir para o resumo" : "Próximo serviço"}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-10 w-full min-w-0 max-w-full gap-1 whitespace-normal py-2 text-center leading-tight"
                  onClick={() => showMode("all")}
                >
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" /> Ver todos os serviços
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-10 w-full min-w-0 max-w-full gap-1 whitespace-normal py-2 text-center leading-tight"
                  onClick={() => showMode("review")}
                >
                  Ver resumo <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </Button>
              </div>
            </div>
          )}

          {mode === "all" && (
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center leading-tight"
                onClick={() => goTo(index, "flow")}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" /> Voltar ao serviço {index + 1}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center leading-tight"
                onClick={() => showMode("review")}
              >
                Ver resumo <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
              {counts.pending > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-10 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center leading-tight sm:col-span-2"
                  onClick={() => {
                    const pending = firstPendingStepIndex(steps, decisions);
                    goTo(pending >= 0 ? pending : index, "flow");
                  }}
                >
                  Ir para o próximo pendente <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Button>
              )}
            </div>
          )}

          {mode === "review" && (
            <div className="min-w-0 space-y-2">
              <Button
                type="button"
                size="lg"
                className="h-auto min-h-12 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center text-base leading-tight"
                onClick={onRequest}
                disabled={selectedSteps.length === 0 && includedCount === 0}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Solicitar reserva dos serviços selecionados
              </Button>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center leading-tight"
                  onClick={() => showMode("all")}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" /> Ver todos os serviços
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 w-full min-w-0 max-w-full gap-2 whitespace-normal py-2 text-center leading-tight"
                  onClick={() => goTo(index, "flow")}
                >
                  <Pencil className="h-4 w-4 shrink-0" /> Voltar ao serviço {index + 1}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
