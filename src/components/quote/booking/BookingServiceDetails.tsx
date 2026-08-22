import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import {
  serviceCompactDigest,
  serviceDigestDetailRows,
} from "@/lib/quoteServiceDigest";
import { buildServicePaymentConditions } from "@/lib/servicePaymentConditions";
import { useBookingCart } from "@/components/quote/booking/BookingCartContext";
import type { QuoteService } from "@/types/quote";

interface Props {
  service: QuoteService | null;
  amountLabel: string | null;
  onClose: () => void;
}

/** Conteúdo de "Ver detalhes": Dialog no desktop, Sheet no mobile. */
export function BookingServiceDetails({ service, amountLabel, onClose }: Props) {
  const isMobile = useIsMobile();
  const cart = useBookingCart();
  const open = !!service;
  const conditions = service
    ? buildServicePaymentConditions(service as any, cart.quote as any, cart.formatAmount)
    : null;
  const showConditions = !!conditions && !conditions.packageMode && conditions.hasConditions;
  const digest = service ? serviceCompactDigest(service) : null;
  const rows = service ? serviceDigestDetailRows(service) : [];

  const body = service && digest && (
    <div className="space-y-4">
      {digest.images.length > 0 && (
        <ServiceImageCarousel
          images={digest.images}
          alt={digest.title}
          placeId={resolveServicePlaceId(service)}
          hideFallback
        />
      )}


      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="flex flex-wrap gap-x-2 text-sm">
            <dt className="font-semibold text-muted-foreground">{row.label}:</dt>
            <dd className="min-w-0 flex-1 text-foreground [overflow-wrap:anywhere]">{row.value}</dd>
          </div>
        ))}
      </dl>

      {digest.shortDescription && (
        <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {digest.shortDescription}
        </p>
      )}

      {amountLabel && (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Valor apresentado
          </p>
          <p className="text-lg font-bold text-foreground">{amountLabel}</p>

          {showConditions && (
            <div
              className="mt-3 border-t border-border/50 pt-3 space-y-1"
              data-service-detail-payment={service.id}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Condições de pagamento
              </p>
              {conditions!.rows.map((row, i) => (
                <p key={`${row.label}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-muted-foreground">{row.label}:</span>
                  <span
                    className={
                      row.emphasis
                        ? "font-bold text-primary tabular-nums"
                        : "font-semibold text-foreground tabular-nums"
                    }
                  >
                    {row.value}
                  </span>
                </p>
              ))}
              {conditions!.methodLabel && (
                <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="text-muted-foreground">Forma de pagamento:</span>
                  <span className="font-medium text-foreground">{conditions!.methodLabel}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const title = digest ? digest.title : "";

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => (v ? null : onClose())}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-base [overflow-wrap:anywhere]">{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-3">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-[min(620px,95vw)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="[overflow-wrap:anywhere]">{title}</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
