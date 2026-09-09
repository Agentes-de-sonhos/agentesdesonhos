import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBookingCart } from "@/components/quote/booking/BookingCartContext";
import { translateQuote } from "@/i18n/publicMaterials/quote";

/**
 * CTA exibido logo depois das condições de pagamento. Abre exatamente a mesma
 * revisão do carrinho fixo — sem renderizar novamente a lista de serviços.
 */
export function BookingCartCta() {
  const cart = useBookingCart();
  if (!cart.enabled) return null;
  const t = translateQuote(cart.locale);

  const submitted = !!cart.success;

  return (
    <section className="animate-fade-up" aria-labelledby="booking-cart-cta-title">
      <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-[0_16px_50px_-24px_rgba(0,0,0,0.18)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              {t("nextStep")}
            </p>
            <h2 id="booking-cart-cta-title" className="text-base font-bold tracking-tight sm:text-lg">
              {submitted ? t("requestSentToAgency") : t("reviewMySelection")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {submitted
                ? t("agencyWillReconfirm")
                : t("selectViaCartIcon")}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            variant={submitted ? "outline" : "default"}
            className="min-h-[48px] w-full gap-2 sm:w-auto"
            onClick={cart.openCart}
          >
            {submitted ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            )}
            {submitted ? t("viewMyRequest") : t("viewMyCart")}
            {!submitted && (
              <Badge variant="secondary" className="text-[11px]" data-booking-cta-badge="true">
                {cart.count}
              </Badge>
            )}
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">
          {cart.count === 1
            ? t("serviceOnRequest", { count: cart.count })
            : t("servicesOnRequest", { count: cart.count })}
        </span>
      </div>
    </section>
  );
}
