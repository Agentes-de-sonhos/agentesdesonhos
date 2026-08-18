import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Check,
  ClipboardCheck,
  Info,
  ListChecks,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { agencyNameToSlug } from "@/lib/orcamento-domain";
import { formatQuoteCurrency, getQuoteCurrencyInfo } from "@/lib/quoteCurrency";
import type { Quote, QuoteChoiceGroup, QuoteService } from "@/types/quote";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import {
  BOOKING_REQUEST_DISCLAIMER,
  bookingCtaLabel,
  bookingSelectionTotal,
  buildBookingSelectionModel,
  effectiveSelectionIds,
  quoteHasLinkedClient,
  validateBookingContact,
  validateBookingSelection,
} from "@/lib/quoteBookingSelection";
import {
  bookingWizardProgress,
  bookingWizardStorageKey,
  buildBookingWizardSteps,
  decidedSelectionIds,
  parseStoredWizardState,
  pruneBookingDecisions,
  type BookingDecisionMap,
} from "@/lib/quoteBookingWizard";
import { QuoteBookingWizardDialog } from "@/components/quote/QuoteBookingWizardDialog";
import { serviceDigestTitle } from "@/lib/quoteServiceDigest";
import { ServiceDigestCompact } from "@/components/quote/ServiceDigestCompact";

interface Props {
  quote: Quote;
  agentProfile?: AgentProfile | null;
  /** Slug da agência quando o link já vem resolvido pela rota/domínio White Label. */
  agencySlugOverride?: string;
  /** Código público do orçamento vindo da rota (fonte preferida). */
  accessCodeOverride?: string;
}

interface SuccessState {
  protocol: string;
  services: string[];
}

/** Título único do serviço, resolvido pelo digest compartilhado. */
const serviceTitle = (service: QuoteService): string => serviceDigestTitle(service);

export function QuoteBookingRequestPanel({ quote, agentProfile, agencySlugOverride, accessCodeOverride }: Props) {
  const services = (quote.services || []) as QuoteService[];
  const groups = ((quote as any).choice_groups || []) as QuoteChoiceGroup[];
  const model = useMemo(
    () => buildBookingSelectionModel(quote, services, groups),
    [quote, services, groups],
  );

  // Escolha assistida: o cliente decide um serviço por vez, na ordem do orçamento.
  const steps = useMemo(
    () => buildBookingWizardSteps(model, quote.sections || [], groups),
    [model, quote.sections, groups],
  );
  const storageKey = bookingWizardStorageKey(String(quote.id || ""));
  const [decisions, setDecisions] = useState<BookingDecisionMap>({});
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStart, setWizardStart] = useState<"flow" | "review">("flow");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  // Retoma escolhas anteriores (o cliente pode fechar a página e voltar depois).
  useEffect(() => {
    if (!quote.id) return;
    try {
      const stored = parseStoredWizardState(localStorage.getItem(storageKey));
      setDecisions(pruneBookingDecisions(steps, stored.decisions));
    } catch {
      /* armazenamento indisponível: segue sem retomar */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id, steps.length]);

  const updateDecisions = (next: BookingDecisionMap) => {
    const pruned = pruneBookingDecisions(steps, next);
    setDecisions(pruned);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ decisions: pruned, reviewed: false }));
    } catch {
      /* ignora falha de armazenamento */
    }
  };

  const selected = useMemo(() => decidedSelectionIds(decisions), [decisions]);
  const progress = bookingWizardProgress(steps, decisions);

  const { currency } = getQuoteCurrencyInfo(quote);
  const fmt = (v: number) => formatQuoteCurrency(v, currency);

  // Orçamento nominal: o cliente já está cadastrado na agência. Não pedimos nome,
  // WhatsApp nem e-mail de novo — o servidor resolve a identidade pela própria
  // quote e ignora qualquer contato enviado pelo navegador.
  const hasLinkedClient = quoteHasLinkedClient(quote);

  const selectionIds = effectiveSelectionIds(model, selected);
  const selectionError = validateBookingSelection(model, selected);
  const { total, label: totalLabel } = bookingSelectionTotal(quote, model, selected);

  const agencySlug =
    agencySlugOverride || agencyNameToSlug((agentProfile as any)?.agency_name || "");
  const publicCode = accessCodeOverride || ((quote as any).public_access_code as string | undefined);
  const canSubmit = !!agencySlug && !!publicCode;

  const selectedServices = services.filter((s) => selectionIds.includes(s.id));

  const openDialog = () => {
    if (selectionError) {
      toast.error(selectionError);
      return;
    }
    idempotencyKey.current = crypto.randomUUID();
    setError(null);
    setSuccess(null);
    setOpen(true);
  };

  const submit = async () => {
    const contactError = validateBookingContact({
      name,
      whatsapp,
      email,
      disclaimerAccepted: accepted,
      hasLinkedClient,
    });
    if (contactError) {
      setError(contactError);
      return;
    }
    if (!canSubmit) {
      setError("Não foi possível identificar este orçamento. Fale com o seu consultor.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-booking-request", {
        body: {
          agency_slug: agencySlug,
          code: publicCode,
          selected_service_ids: selectionIds,
          // Nunca enviamos contato quando o orçamento é nominal.
          client_name: hasLinkedClient ? "" : name.trim(),
          client_email: hasLinkedClient ? "" : email.trim(),
          client_whatsapp: hasLinkedClient ? "" : whatsapp.trim(),
          client_notes: notes.trim() || null,
          disclaimer_accepted: true,
          // Retry seguro: a mesma chave devolve o mesmo pedido, sem duplicar.
          idempotency_key: idempotencyKey.current,
        },
      });
      if (fnError) {
        let message = "Não foi possível enviar sua solicitação agora. Tente novamente.";
        try {
          const ctx = (fnError as any)?.context;
          if (ctx?.text) {
            const body = JSON.parse(await ctx.text());
            if (body?.error) message = String(body.error);
          }
        } catch {
          /* mantém a mensagem genérica */
        }
        setError(message);
        return;
      }
      if ((data as any)?.error) {
        setError(String((data as any).error));
        return;
      }
      setSuccess({
        protocol: String((data as any)?.protocol || ""),
        services: selectedServices.map(serviceTitle),
      });
    } catch {
      setError("Não foi possível enviar sua solicitação agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (services.length === 0) return null;

  const renderLockedRow = (service: QuoteService) => {
    const amount = Number((service as any).amount) || 0;
    return (
      <div
        key={service.id}
        className="flex w-full min-w-0 max-w-full flex-wrap items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-4"
      >
        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Lock className="h-3 w-3" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <ServiceDigestCompact service={service} withThumb />
          <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-primary/80">
            Incluído na proposta
          </span>
        </span>
        {!model.hideAmounts && amount > 0 && (
          <span className="ml-auto break-words text-sm font-semibold text-foreground">{fmt(amount)}</span>
        )}
      </div>
    );
  };

  const openWizard = (start: "flow" | "review") => {
    setWizardStart(start);
    setWizardOpen(true);
  };

  const chosenSteps = steps.filter((s) => decisions[s.serviceId] === "yes");
  const noChoicesYet = progress.decided === 0;

  return (
    <section className="animate-fade-up" aria-labelledby="booking-request-title">
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-white shadow-[0_16px_50px_-24px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              Próximo passo
            </p>
            <h2 id="booking-request-title" className="text-base font-bold tracking-tight sm:text-lg">
              {model.packageMode ? "Solicitar reserva deste pacote" : "Escolha o que deseja reservar"}
            </h2>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          {model.packageMode ? (
            <p className="text-sm text-muted-foreground">
              Este orçamento tem valor fechado de pacote: todos os serviços abaixo são solicitados
              em conjunto.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vamos passar serviço por serviço para você decidir o que quer reservar. Itens incluídos fazem parte da
              proposta e não podem ser retirados.
            </p>
          )}

          {model.packageMode ? (
            <div className="space-y-2">{services.map(renderLockedRow)}</div>
          ) : (
            <div className="space-y-3">
              {model.requiredServices.length > 0 && (
                <div className="space-y-2">{model.requiredServices.map(renderLockedRow)}</div>
              )}

              {noChoicesYet ? (
                <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">
                      Vamos escolher juntos, um serviço por vez
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mostramos cada serviço com fotos, datas e detalhes. Você decide se quer
                      reservar ou seguir para o próximo — e pode voltar quando quiser.
                    </p>
                  </div>
                  <Button type="button" size="lg" className="w-full gap-2" onClick={() => openWizard("flow")}>
                    <ListChecks className="h-4 w-4" />
                    Escolher meus serviços ({steps.length})
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Suas escolhas ({chosenSteps.length})
                    </p>
                    <Badge variant={progress.complete ? "secondary" : "outline"} className="text-[10px]">
                      {progress.decided} de {progress.total} serviços avaliados
                    </Badge>
                  </div>

                  {chosenSteps.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                      Você ainda não escolheu nenhum serviço para reservar.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {chosenSteps.map((s) => {
                        const amount = Number((s.service as any).amount) || 0;
                        return (
                          <div
                            key={s.serviceId}
                            className="flex w-full min-w-0 max-w-full flex-wrap items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 sm:p-4"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <ServiceDigestCompact service={s.service} withThumb />
                            {!model.hideAmounts && amount > 0 && (
                              <span className="ml-auto break-words text-sm font-semibold text-foreground">
                                {fmt(amount)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => openWizard("review")}
                    >
                      <ListChecks className="h-4 w-4" /> Ver resumo das escolhas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => openWizard("flow")}
                    >
                      <Pencil className="h-4 w-4" />
                      {progress.complete ? "Editar escolhas" : "Continuar escolhendo"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {totalLabel}
              </p>
              <p className="text-lg font-bold text-foreground">
                {total != null ? fmt(total) : "A confirmar com a agência"}
              </p>
            </div>
            <p className="mt-2 flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{BOOKING_REQUEST_DISCLAIMER}</span>
            </p>
          </div>

          {selectionError && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {selectionError}
            </p>
          )}

          {(model.packageMode || !noChoicesYet) && (
            <Button
              type="button"
              size="lg"
              className="w-full gap-2"
              onClick={openDialog}
              disabled={!!selectionError || (!model.packageMode && selectionIds.length === 0)}
            >
              <BadgeCheck className="h-4 w-4" />
              {bookingCtaLabel(model, selectionIds.length)}
            </Button>
          )}
        </div>
      </div>

      {!model.packageMode && steps.length > 0 && (
        <QuoteBookingWizardDialog
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          steps={steps}
          decisions={decisions}
          onDecisionsChange={updateDecisions}
          includedServices={model.requiredServices}
          formatAmount={fmt}
          hideAmounts={model.hideAmounts}
          totalLabel={totalLabel}
          selectedTotal={total}
          selectionError={selectionError}
          startAt={wizardStart}
          onRequest={() => {
            setWizardOpen(false);
            openDialog();
          }}
        />
      )}

      <Dialog open={open} onOpenChange={(v) => (submitting ? null : setOpen(v))}>
        <DialogContent className="box-border max-h-[92dvh] w-[95vw] min-w-0 max-w-[min(560px,95vw)] overflow-x-hidden overflow-y-auto">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-center text-lg">Solicitação enviada</DialogTitle>
                <DialogDescription className="text-center">
                  Guarde o número do seu protocolo.
                </DialogDescription>
              </DialogHeader>
              <p className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-base font-bold tracking-wide">
                {success.protocol}
              </p>
              <div className="rounded-xl border border-border/50 p-3 text-left">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Serviços solicitados
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground [overflow-wrap:anywhere]">
                  {success.services.map((s, i) => (
                    <li key={`${s}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                A agência vai reconfirmar serviços, disponibilidade e valores e entrará em contato{" "}
                {hasLinkedClient ? "pelos canais cadastrados" : "pelo canal informado"}. Esta
                solicitação ainda não é uma reserva confirmada.
              </p>
              <Button type="button" className="w-full" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg">Confirmar solicitação de reserva</DialogTitle>
                <DialogDescription>
                  {hasLinkedClient
                    ? "Revise os serviços e confirme sua solicitação."
                    : "Revise os serviços e informe como a agência pode falar com você."}
                </DialogDescription>
              </DialogHeader>

              <div className="min-w-0 rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Serviços solicitados ({selectedServices.length})
                </p>
                <ul className="space-y-2 text-sm">
                  {selectedServices.map((s) => {
                    const amount = Number((s as any).amount) || 0;
                    return (
                      <li
                        key={s.id}
                        className="flex w-full min-w-0 max-w-full flex-wrap items-start gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                      >
                        <ServiceDigestCompact service={s} withThumb />
                        {!model.hideAmounts && amount > 0 && (
                          <span className="ml-auto break-words font-medium">{fmt(amount)}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border/50 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {totalLabel}
                  </span>
                  <span className="text-sm font-bold">
                    {total != null ? fmt(total) : "A confirmar"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {!hasLinkedClient && (
                <>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="br-name" className="text-xs">Nome completo *</Label>
                  <Input
                    id="br-name"
                    value={name}
                    maxLength={200}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="br-whats" className="text-xs">WhatsApp</Label>
                  <Input
                    id="br-whats"
                    value={whatsapp}
                    maxLength={40}
                    inputMode="tel"
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="br-email" className="text-xs">E-mail</Label>
                  <Input
                    id="br-email"
                    type="email"
                    value={email}
                    maxLength={200}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground sm:col-span-2">
                  Informe pelo menos WhatsApp ou e-mail.
                </p>
                </>
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="br-notes" className="text-xs">Observações (opcional)</Label>
                  <Textarea
                    id="br-notes"
                    rows={3}
                    maxLength={2000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Preferências, datas alternativas, dúvidas…"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  aria-label="Aceito o aviso sobre a solicitação de reserva"
                />
                <span className="text-[12px] leading-relaxed text-muted-foreground">
                  {BOOKING_REQUEST_DISCLAIMER}
                </span>
              </label>

              {error && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button type="button" className="w-full gap-2" onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {submitting ? "Enviando…" : "Enviar solicitação"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
