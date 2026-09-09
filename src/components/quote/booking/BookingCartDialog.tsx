import { useMemo, useState } from "react";
import {
  CheckCircle2,
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
import { translateQuote } from "@/i18n/publicMaterials/quote";

/**
 * Modal amplo "Minha solicitação de reserva".
 * Revisão + contato + envio em um único lugar — sem wizard sequencial e sem
 * renderizar uma segunda vitrine de serviços.
 */
export function BookingCartDialog() {
  const cart = useBookingCart();
  const t = translateQuote(cart.locale);
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
              {success ? t("requestSentToAgency") : t("myBookingRequestTitle")}
            </DialogTitle>
            <DialogDescription>
              {success
                ? t("agencyWillReconfirm")
                : hasLinkedClient
                  ? t("reviewServicesConfirm")
                  : t("reviewServicesContact")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 sm:px-6">
            {success ? (
              <div className="mx-auto max-w-xl space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-foreground">{t("requestSent")}</p>
                    {success.fileNumber ? (
                      <p className="text-sm font-semibold tabular-nums text-muted-foreground">
                        {t("bookingProcessNumber", { number: success.fileNumber })}
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
                    {t("servicesRequested")}
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground [overflow-wrap:anywhere]">
                    {success.services.map((s, i) => (
                      <li key={`${s}-${i}`}>{s}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasLinkedClient ? t("notYetConfirmedRegisteredChannels") : t("notYetConfirmedInformedChannel")}
                </p>
              </div>
            ) : isEmpty ? (
              <div className="mx-auto max-w-md space-y-3 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShoppingCart className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-base font-bold text-foreground">{t("emptySelectionTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("emptySelectionBody")}
                </p>
                <Button type="button" variant="outline" onClick={() => cart.setCartOpen(false)}>
                  {t("continueChoosing")}
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
                                      {t("viewDetails")}
                                    </button>
                                    {canRemove ? (
                                      <button
                                        type="button"
                                        onClick={() => cart.remove(entry.service.id)}
                                        aria-label={t("removeServiceAria", { label: entry.service.option_label || t("defaultServiceWord") })}
                                        title={t("removeFromRequest")}
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                      >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                      </button>
                                    ) : (
                                      <span
                                        className="inline-flex h-11 w-11 items-center justify-center text-primary/70"
                                        title={
                                          entry.locked
                                            ? t("includedInProposal")
                                            : t("selectAnotherOptionToSwap")
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    {!hasLinkedClient && (
                      <>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="br-name" className="text-xs">
                            {t("fullNameLabel")}
                          </Label>
                          <Input
                            id="br-name"
                            value={name}
                            maxLength={200}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("namePlaceholder")}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="br-whats" className="text-xs">
                            {t("whatsappLabel")}
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
                            {t("emailLabel")}
                          </Label>
                          <Input
                            id="br-email"
                            type="email"
                            value={email}
                            maxLength={200}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("emailPlaceholder")}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground sm:col-span-2">
                          {t("provideWhatsappOrEmail")}
                        </p>
                      </>
                    )}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="br-notes" className="text-xs">
                        {t("notesLabel")}
                      </Label>
                      <Textarea
                        id="br-notes"
                        rows={3}
                        maxLength={2000}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("notesPlaceholder")}
                        className="border-primary/40 bg-background ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        data-booking-continue-body
                        className="min-h-[44px] w-full sm:w-auto border-border bg-muted font-medium text-foreground hover:bg-muted/80 hover:text-foreground"
                        onClick={() => cart.setCartOpen(false)}
                        disabled={cart.submitting}
                      >
                        {t("continueChoosing")}
                      </Button>
                    </div>

                  </div>
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
                {t("close")}
              </Button>
            ) : (
              <>
                {!isEmpty && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cart.totalLabel}
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {cart.total != null ? cart.formatAmount(cart.total) : t("toConfirmWithAgency")}
                    </span>
                  </div>
                )}
                {!isEmpty && (
                  <label
                    data-booking-disclaimer-accept
                    className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={accepted}
                      onCheckedChange={(v) => setAccepted(v === true)}
                      aria-label={t("acceptBookingDisclaimer")}
                    />
                    <span>{BOOKING_REQUEST_DISCLAIMER}</span>
                  </label>
                )}
                {(error || cart.validationError) && (
                  <p className="text-xs font-medium text-destructive" role="alert">
                    {error || cart.validationError}
                  </p>
                )}
                {!isEmpty && (
                  <div className="flex sm:justify-end">
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
                      {cart.submitting ? t("sending") : t("sendBookingRequest")}
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
