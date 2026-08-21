import { useRef } from "react";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingCart } from "@/components/quote/booking/BookingCartContext";
import type { QuoteService } from "@/types/quote";

/**
 * Ação inline de seleção, injetada no canto inferior direito dos cards de
 * serviço JÁ existentes no orçamento público. Não duplica dados nem
 * reconstrói o card: apenas adiciona/remove da solicitação de reserva.
 */
export function InlineBookingAction({
  service,
  className,
}: {
  service: QuoteService;
  className?: string;
}) {
  const cart = useBookingCart();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const state = cart.enabled ? cart.stateFor(service.id) : null;
  if (!state) return null;

  if (state.action === "locked") {
    return (
      <div
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
          className,
        )}
        data-booking-inline-action="locked"
        data-service-id={service.id}
        title="Incluído na proposta"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Incluído
      </div>
    );
  }

  const selected = state.selected;
  const label = selected
    ? state.canRemove
      ? "Adicionado à solicitação — toque para remover"
      : "Adicionado à solicitação"
    : "Adicionar à solicitação de reserva";

  return (
    <div className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => cart.toggle(service.id, buttonRef.current)}
        aria-pressed={selected}
        aria-label={label}
        title={label}
        data-booking-inline-action={selected ? "selected" : "add"}
        data-service-id={service.id}
        className={cn(
          "relative inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95",
          selected
            ? "bg-success text-success-foreground shadow-success/30 hover:brightness-105 focus-visible:ring-success"
            : "bg-primary text-primary-foreground shadow-primary/30 hover:brightness-110 focus-visible:ring-primary",
        )}
      >
        {selected ? (
          <Check className="h-6 w-6" strokeWidth={2.75} aria-hidden="true" />
        ) : (
          <>
            <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden="true" />
            <span
              className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-card shadow-sm"
              aria-hidden="true"
            >
              <Plus className="h-3 w-3 text-primary" strokeWidth={3} />
            </span>
          </>
        )}
      </button>
      {selected && !state.canRemove && (
        <span className="max-w-[180px] text-right text-[10px] leading-tight text-muted-foreground">
          Selecione outra opção para trocar
        </span>
      )}
    </div>
  );
}
