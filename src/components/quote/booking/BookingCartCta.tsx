import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBookingCart } from "@/components/quote/booking/BookingCartContext";

/**
 * CTA exibido logo depois das condições de pagamento. Abre exatamente a mesma
 * revisão do carrinho fixo — sem renderizar novamente a lista de serviços.
 */
export function BookingCartCta() {
  const cart = useBookingCart();
  if (!cart.enabled) return null;

  const submitted = !!cart.success;

  return (
    <section className="animate-fade-up" aria-labelledby="booking-cart-cta-title">
      <div className="rounded-3xl border border-border/40 bg-white p-5 shadow-[0_16px_50px_-24px_rgba(0,0,0,0.18)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              Próximo passo
            </p>
            <h2 id="booking-cart-cta-title" className="text-base font-bold tracking-tight sm:text-lg">
              {submitted ? "Solicitação enviada à agência" : "Revisar minha seleção"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {submitted
                ? "A agência vai reconfirmar disponibilidade, valores e condições."
                : "Selecione os serviços pelo ícone de carrinho em cada item e revise sua solicitação aqui."}
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
            {submitted ? "Ver minha solicitação" : "Ver meu carrinho"}
            {!submitted && (
              <Badge variant="secondary" className="text-[11px]" data-booking-cta-badge="true">
                {cart.count}
              </Badge>
            )}
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">
          {cart.count === 1
            ? "1 serviço na solicitação"
            : `${cart.count} serviços na solicitação`}
        </span>
      </div>
    </section>
  );
}
