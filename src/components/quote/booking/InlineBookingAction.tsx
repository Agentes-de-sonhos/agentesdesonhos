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
          "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1.5 text-[11px] font-semibold text-primary",
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
          "relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          selected
            ? "border-primary bg-primary text-primary-foreground shadow-sm"
            : "border-border/70 bg-card text-foreground hover:border-primary/60 hover:bg-primary/5",
        )}
      >
        {selected ? (
          <Check className="h-[18px] w-[18px]" aria-hidden="true" />
        ) : (
          <>
            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
            <Plus
              className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-primary p-[1px] text-primary-foreground"
              aria-hidden="true"
            />
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
