import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingCart } from "@/components/quote/booking/BookingCartContext";
import { BOOKING_CART_TARGET_ATTR } from "@/lib/bookingCartFly";
import { setBookingSelectionBarActive } from "@/lib/bookingSelectionBar";

/**
 * Carrinho persistente do orçamento público.
 * Desktop: fixo no canto superior direito, logo abaixo do cabeçalho.
 * Mobile: botão circular fixo no canto inferior direito, coordenado com o
 * WhatsApp e demais flutuantes via `bookingSelectionBar`.
 * Sempre acessível — inclusive com zero itens.
 */
export function BookingCartLauncher() {
  const cart = useBookingCart();
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const previous = useRef(cart.count);

  useEffect(() => setMounted(true), []);

  // Registra a presença do flutuante para que WhatsApp/CTA subam.
  useEffect(() => {
    if (!cart.enabled) return;
    setBookingSelectionBarActive(true, 72);
    return () => setBookingSelectionBarActive(false);
  }, [cart.enabled]);

  useEffect(() => {
    if (cart.count === previous.current) return;
    previous.current = cart.count;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 260);
    return () => clearTimeout(t);
  }, [cart.count]);

  if (!cart.enabled || !mounted) return null;

  const badge = (
    <span
      className={cn(
        "absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow",
        pulse && "animate-scale-in",
      )}
      data-booking-cart-badge="true"
    >
      {cart.count}
    </span>
  );

  const srCounter = (
    <span className="sr-only" aria-live="polite">
      {cart.count === 1 ? "1 serviço na solicitação" : `${cart.count} serviços na solicitação`}
    </span>
  );

  return createPortal(
    <>
      {/* Desktop / tablet */}
      <button
        type="button"
        onClick={cart.openCart}
        {...{ [BOOKING_CART_TARGET_ATTR]: "desktop" }}
        aria-label="Abrir minha solicitação de reserva"
        title="Minha solicitação de reserva"
        className="fixed right-4 top-[4.5rem] z-40 hidden items-center gap-2 rounded-full border border-border/60 bg-card/95 px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:inline-flex"
      >
        <span className="relative inline-flex">
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          {badge}
        </span>
        <span className="hidden lg:inline">Minha seleção</span>
        {srCounter}
      </button>

      {/* Mobile */}
      <button
        type="button"
        onClick={cart.openCart}
        {...{ [BOOKING_CART_TARGET_ATTR]: "mobile" }}
        aria-label="Abrir minha solicitação de reserva"
        title="Minha solicitação de reserva"
        className="fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <span className="relative inline-flex">
          <ShoppingCart className="h-6 w-6" aria-hidden="true" />
          <span
            className={cn(
              "absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-card px-1 text-[11px] font-bold text-primary shadow ring-1 ring-primary/30",
              pulse && "animate-scale-in",
            )}
            data-booking-cart-badge="mobile"
          >
            {cart.count}
          </span>
        </span>
        {srCounter}
      </button>
    </>,
    document.body,
  );
}
