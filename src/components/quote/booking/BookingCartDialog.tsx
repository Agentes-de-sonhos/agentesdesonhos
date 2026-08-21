import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Info,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ServiceDigestCompact } from "@/components/quote/ServiceDigestCompact";
import { BookingServiceDetails } from "@/components/quote/booking/BookingServiceDetails";
import { useBookingCart } from "@/components/quote/booking/BookingCartContext";
import {
  BOOKING_REQUEST_DISCLAIMER,
  validateBookingContact,
} from "@/lib/quoteBookingSelection";
import { buildSelectionSummary, sectionMetaChips } from "@/lib/quoteBookingShowcase";
import type { QuoteService } from "@/types/quote";

/**
 * Modal amplo "Minha solicitação de reserva".
 * Revisão + contato + envio em um único lugar — sem wizard sequencial e sem
 * renderizar uma segunda vitrine de serviços.
 */
export function BookingCartDialog() {
  const cart = useBookingCart();
  const [details, setDetails] = useState<QuoteService | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const summary = useMemo(
    () => (cart.enabled ? buildSelectionSummary(cart.showcase, cart.selected) : []),
    [cart.enabled, cart.showcase, cart.selected],
  );

  if (!cart.enabled) return null;

  const success = cart.success;
  const hasLinkedClient = cart.hasLinkedClient;
  const amountOf = (service: QuoteService) => {
    if (cart.hideAmounts) return null;
    const amount = Number((service as any).amount) || 0;
    return amount > 0 ? cart.formatAmount(amount) : null;
  };

  const handleSubmit = async () => {
    const contactError = validateBookingContact({
      name,
      whatsapp,
      email,
      disclaimerAccepted: accepted,
      hasLinkedClient,
    });
    if (contactError) {
      setLocalError(contactError);
      return;
    }
    if (cart.validationError) {
      setLocalError(cart.validationError);
      return;
    }
    setLocalError(null);
    await cart.submit({ name, email, whatsapp, notes });
  };

  const error = localError || cart.submitError;
  const isEmpty = cart.count === 0;

  return (
    <>
      <Dialog
        open={cart.cartOpen}
        onOpenChange={(v) => (cart.submitting ? null : cart.setCartOpen(v))}
      >
        <DialogContent
          className="box-border flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92dvh] sm:w-[94vw] sm:max-w-[min(1100px,94vw)] sm:rounded-2xl"
          data-booking-cart-dialog="true"
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-border/50 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />
              {success ? "Solicitação enviada à agência" : "Minha solicitação de reserva"}
            </DialogTitle>
            <DialogDescription>
              {success
                ? "A agência vai reconfirmar disponibilidade, valores e condições."
                : hasLinkedClient
                  ? "Revise os serviços e confirme sua solicitação."
                  : "Revise os serviços e informe como a agência pode falar com você."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 sm:px-6">
            {success ? (
              <div className="mx-auto max-w-xl space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-foreground">Solicitação enviada</p>
                    {success.fileNumber ? (
                      <p className="text-sm font-semibold tabular-nums text-muted-foreground">
                        Processo de reserva nº {success.fileNumber}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold tracking-wide text-muted-foreground">
                        {success.protocol}
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-3">
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
                  Esta solicitação ainda não é uma reserva confirmada. A agência entrará em contato{" "}
                  {hasLinkedClient ? "pelos canais cadastrados" : "pelo canal informado"}.
                </p>
              </div>
            ) : isEmpty ? (
              <div className="mx-auto max-w-md space-y-3 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShoppingCart className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-base font-bold text-foreground">Sua seleção está vazia</p>
                <p className="text-sm text-muted-foreground">
                  Use o ícone de carrinho em cada serviço do orçamento para escolher o que deseja
                  solicitar. Nada é reservado ou cobrado nesta etapa.
                </p>
                <Button type="button" variant="outline" onClick={() => cart.setCartOpen(false)}>
                  Continuar escolhendo
                </Button>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-4">
                  {summary.map((group) => {
                    const chips = sectionMetaChips(group.sectionMeta);
                    return (
                      <div key={group.key} className="space-y-2">
                        {group.sectionTitle && (
                          <div className="space-y-1">
                            <p className="text-sm font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
                              {group.sectionTitle}
                            </p>
                            {chips.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {chips.map((chip) => (
                                  <span
                                    key={chip}
                                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                                  >
                                    <MapPin className="h-3 w-3" aria-hidden="true" />
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <ul className="space-y-2">
                          {group.entries.map((entry) => {
                            const state = cart.stateFor(entry.service.id);
                            const canRemove = !entry.locked && !!state?.canRemove;
                            const label = amountOf(entry.service);
                            return (
                              <li
                                key={entry.service.id}
                                className="flex w-full min-w-0 flex-wrap items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-3"
                                data-cart-item={entry.service.id}
                              >
                                <ServiceDigestCompact service={entry.service} withThumb />
                                <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
                                  {label && (
                                    <span className="text-sm font-semibold text-foreground">
                                      {label}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setDetails(entry.service)}
                                      className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                                    >
                                      Ver detalhes
                                    </button>
                                    {canRemove ? (
                                      <button
                                        type="button"
                                        onClick={() => cart.remove(entry.service.id)}
                                        aria-label={`Remover ${entry.service.option_label || "serviço"} da solicitação`}
                                        title="Remover da solicitação"
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                      >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                      </button>
                                    ) : (
                                      <span
                                        className="inline-flex h-11 w-11 items-center justify-center text-primary/70"
                                        title={
                                          entry.locked
                                            ? "Incluído na proposta"
                                            : "Selecione outra opção no orçamento para trocar"
                                        }
                                      >
                                        <Lock className="h-4 w-4" aria-hidden="true" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <div className="min-w-0 space-y-4 lg:rounded-2xl lg:border lg:border-border/50 lg:bg-muted/20 lg:p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    Revisão e envio
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {!hasLinkedClient && (
                      <>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="br-name" className="text-xs">
                            Nome completo *
                          </Label>
                          <Input
                            id="br-name"
                            value={name}
                            maxLength={200}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="br-whats" className="text-xs">
                            WhatsApp
                          </Label>
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
                          <Label htmlFor="br-email" className="text-xs">
                            E-mail
                          </Label>
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
                      <Label htmlFor="br-notes" className="text-xs">
                        Observações (opcional)
                      </Label>
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

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
                    <Checkbox
                      checked={accepted}
                      onCheckedChange={(v) => setAccepted(v === true)}
                      aria-label="Aceito o aviso sobre a solicitação de reserva"
                    />
                    <span className="text-[12px] leading-relaxed text-muted-foreground">
                      {BOOKING_REQUEST_DISCLAIMER}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div
            className="shrink-0 space-y-2 border-t border-border/50 bg-card px-5 py-4 sm:px-6"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {success ? (
              <Button type="button" className="w-full sm:ml-auto sm:w-auto" onClick={() => cart.setCartOpen(false)}>
                Fechar
              </Button>
            ) : (
              <>
                {!isEmpty && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cart.totalLabel}
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {cart.total != null ? cart.formatAmount(cart.total) : "A confirmar com a agência"}
                    </span>
                  </div>
                )}
                <p className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{BOOKING_REQUEST_DISCLAIMER}</span>
                </p>
                {(error || cart.validationError) && (
                  <p className="text-xs font-medium text-destructive" role="alert">
                    {error || cart.validationError}
                  </p>
                )}
                {!isEmpty && (
                  <div className="flex flex-col gap-2 sm:flex-row-reverse">
                    <Button
                      type="button"
                      size="lg"
                      className="min-h-[48px] w-full gap-2 sm:w-auto"
                      onClick={handleSubmit}
                      disabled={cart.submitting}
                    >
                      {cart.submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      )}
                      {cart.submitting ? "Enviando…" : "Enviar solicitação de reserva"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => cart.setCartOpen(false)}
                      disabled={cart.submitting}
                    >
                      Continuar escolhendo
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BookingServiceDetails
        service={details}
        amountLabel={details ? amountOf(details) : null}
        onClose={() => setDetails(null)}
      />
    </>
  );
}
