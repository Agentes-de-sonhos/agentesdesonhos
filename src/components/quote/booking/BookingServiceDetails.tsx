import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResolvedServiceThumb } from "@/components/shared/ResolvedServiceImage";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import {
  serviceCompactDigest,
  serviceDigestDetailRows,
} from "@/lib/quoteServiceDigest";
import type { QuoteService } from "@/types/quote";

interface Props {
  service: QuoteService | null;
  amountLabel: string | null;
  onClose: () => void;
}

/** Conteúdo de "Ver detalhes": Dialog no desktop, Sheet no mobile. */
export function BookingServiceDetails({ service, amountLabel, onClose }: Props) {
  const isMobile = useIsMobile();
  const open = !!service;
  const digest = service ? serviceCompactDigest(service) : null;
  const rows = service ? serviceDigestDetailRows(service) : [];

  const body = service && digest && (
    <div className="space-y-4">
      {digest.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {digest.images.slice(0, 4).map((img, i) => (
            <div
              key={`${img}-${i}`}
              className="aspect-[4/3] overflow-hidden rounded-xl bg-muted first:col-span-2"
            >
              <ResolvedServiceThumb
                imageRef={img}
                placeId={resolveServicePlaceId(service)}
                alt={digest.title}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
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
