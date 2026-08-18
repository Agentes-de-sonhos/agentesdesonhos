import { useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
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
  initialBookingSelection,
  quoteHasLinkedClient,
  toggleBookingSelection,
  validateBookingContact,
  validateBookingSelection,
} from "@/lib/quoteBookingSelection";

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

function serviceTitle(service: QuoteService): string {
  const data = (service.service_data as any) || {};
  return (
    (service.option_label && String(service.option_label).trim()) ||
    (data.custom_title && String(data.custom_title).trim()) ||
    (data.name && String(data.name).trim()) ||
    (data.hotel_name && String(data.hotel_name).trim()) ||
    String(service.service_type)
  );
}

export function QuoteBookingRequestPanel({ quote, agentProfile, agencySlugOverride, accessCodeOverride }: Props) {
  const services = (quote.services || []) as QuoteService[];
  const groups = ((quote as any).choice_groups || []) as QuoteChoiceGroup[];
  const model = useMemo(
    () => buildBookingSelectionModel(quote, services, groups),
    [quote, services, groups],
  );

  const [selected, setSelected] = useState<string[]>(() => initialBookingSelection(model));
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

  const { currency } = getQuoteCurrencyInfo(quote);
  const fmt = (v: number) => formatQuoteCurrency(v, currency);

  // Orçamento nominal: o cliente já está cadastrado na agência. Não pedimos nome,
  // WhatsApp nem e-mail de novo — o servidor resolve a identidade pela própria
  // quote e ignora qualquer contato enviado pelo navegador.
  const hasLinkedClient = quoteHasLinkedClient(quote);

  const selectionIds = effectiveSelectionIds(model, selected);
  const selectionError = validateBookingSelection(model, selected);
  const { total, label: totalLabel } = bookingSelectionTotal(quote, model, selected);
  const disclaimerText = (quote.booking_disclaimer || "").trim() || BOOKING_REQUEST_DISCLAIMER;

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

  const renderRow = (service: QuoteService, mode: "locked" | "checkbox" | "radio") => {
    const checked = selectionIds.includes(service.id);
    const amount = Number((service as any).amount) || 0;
    const showAmount = !model.hideAmounts && amount > 0;
    return (
      <label
        key={service.id}
        className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 transition-colors ${
          checked ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card hover:bg-muted/40"
        } ${mode === "locked" ? "cursor-default" : "cursor-pointer"}`}
      >
        {mode === "locked" ? (
          <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Lock className="h-3 w-3" aria-hidden="true" />
          </span>
        ) : (
          <Checkbox
            checked={checked}
            className={mode === "radio" ? "rounded-full" : undefined}
            onCheckedChange={() => setSelected((prev) => toggleBookingSelection(model, prev, service.id))}
            aria-label={`Selecionar ${serviceTitle(service)}`}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{serviceTitle(service)}</span>
          {mode === "locked" && (
            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-primary/80">
              Incluído
            </span>
          )}
        </span>
        {showAmount && (
          <span className="shrink-0 text-sm font-semibold text-foreground">{fmt(amount)}</span>
        )}
      </label>
    );
  };

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
              Marque os serviços que deseja solicitar. Itens marcados como incluídos fazem parte da
              proposta e não podem ser retirados.
            </p>
          )}

          <div className="space-y-2">
            {model.packageMode
              ? services.map((s) => renderRow(s, "locked"))
              : (
                <>
                  {model.requiredServices.map((s) => renderRow(s, "locked"))}
                  {model.optionalServices.map((s) => renderRow(s, "checkbox"))}
                  {model.groups.map(({ group, services: groupServices }) => (
                    <div key={group.id} className="rounded-xl border border-dashed border-border/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{group.title}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {group.group_type === "alternative"
                            ? "Escolha 1 opção"
                            : group.max_select
                              ? `Escolha de ${group.min_select ?? 0} a ${group.max_select}`
                              : `Escolha ${group.min_select ?? 0} ou mais`}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {groupServices.map((s) =>
                          renderRow(s, group.group_type === "alternative" ? "radio" : "checkbox"),
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
          </div>

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

          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            onClick={openDialog}
            disabled={!!selectionError}
          >
            <BadgeCheck className="h-4 w-4" />
            {bookingCtaLabel(model, selectionIds.length)}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => (submitting ? null : setOpen(v))}>
        <DialogContent className="max-h-[92dvh] w-[95vw] max-w-[560px] overflow-y-auto">
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
                <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground">
                  {success.services.map((s, i) => (
                    <li key={`${s}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                A agência vai reconfirmar serviços, disponibilidade e valores e entrará em contato
                pelo canal informado. Esta solicitação ainda não é uma reserva confirmada.
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
                    ? "Revise os serviços que deseja solicitar e confirme o envio."
                    : "Revise os serviços e informe como a agência pode falar com você."}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Serviços solicitados ({selectedServices.length})
                </p>
                <ul className="space-y-1 text-sm">
                  {selectedServices.map((s) => {
                    const amount = Number((s as any).amount) || 0;
                    return (
                      <li key={s.id} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate">{serviceTitle(s)}</span>
                        {!model.hideAmounts && amount > 0 && (
                          <span className="shrink-0 font-medium">{fmt(amount)}</span>
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
                {hasLinkedClient ? (
                  <div className="space-y-1 rounded-xl border border-border/50 bg-muted/20 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Seus dados
                    </p>
                    <p className="text-sm text-foreground">
                      Este orçamento foi montado especialmente para você: a agência já tem seus
                      dados de contato e vai retornar pelos canais combinados.
                    </p>
                  </div>
                ) : (
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
                  {disclaimerText}
                  {disclaimerText !== BOOKING_REQUEST_DISCLAIMER && (
                    <>
                      {" "}
                      <span className="block pt-1">{BOOKING_REQUEST_DISCLAIMER}</span>
                    </>
                  )}
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
