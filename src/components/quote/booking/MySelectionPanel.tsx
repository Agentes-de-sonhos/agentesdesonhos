import { useEffect, useRef } from "react";
import { BadgeCheck, Info, Lock, MapPin, ShoppingBag, Trash2 } from "lucide-react";
import { setBookingSelectionBarActive } from "@/lib/bookingSelectionBar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ServiceDigestCompact } from "@/components/quote/ServiceDigestCompact";
import { BOOKING_REQUEST_DISCLAIMER } from "@/lib/quoteBookingSelection";
import {
  buildSelectionSummary,
  sectionMetaChips,
  type ShowcaseBlock,
  type ShowcaseModel,
} from "@/lib/quoteBookingShowcase";

interface PanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showcase: ShowcaseModel;
  selected: string[];
  count: number;
  hideAmounts: boolean;
  formatAmount: (value: number) => string;
  totalLabel: string;
  total: number | null;
  validationError: string | null;
  ctaLabel: string;
  onRemove: (block: ShowcaseBlock | null, serviceId: string) => void;
  onSubmit: () => void;
}

/** Painel "Minha seleção": resumo por seção, remover/trocar e CTA. */
export function MySelectionPanel({
  open,
  onOpenChange,
  showcase,
  selected,
  count,
  hideAmounts,
  formatAmount,
  totalLabel,
  total,
  validationError,
  ctaLabel,
  onRemove,
  onSubmit,
}: PanelProps) {
  const summary = buildSelectionSummary(showcase, selected);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[min(440px,100vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[440px]"
      >
        <SheetHeader className="border-b border-border/50 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" />
            Minha seleção
            <Badge variant="secondary" className="text-[10px]">
              {count}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {summary.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              Você ainda não selecionou nenhum serviço. Explore as opções e toque em “Adicionar à
              seleção”.
            </p>
          ) : (
            summary.map((group) => {
              const chips = sectionMetaChips(group.sectionMeta);
              return (
                <div key={group.key} className="space-y-2">
                  {group.sectionTitle && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground [overflow-wrap:anywhere]">
                        {group.sectionTitle}
                      </p>
                      {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
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
                  <div className="space-y-2">
                    {group.entries.map((entry) => {
                      const amount = Number((entry.service as any).amount) || 0;
                      return (
                        <div
                          key={entry.service.id}
                          className="flex w-full min-w-0 items-start gap-2 rounded-xl border border-border/60 bg-white p-3"
                        >
                          <ServiceDigestCompact service={entry.service} withThumb />
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {!hideAmounts && amount > 0 && (
                              <span className="text-sm font-semibold">{formatAmount(amount)}</span>
                            )}
                            {entry.locked ? (
                              <span
                                className="text-muted-foreground"
                                title="Incluído na proposta"
                                aria-label="Incluído na proposta"
                              >
                                <Lock className="h-4 w-4" aria-hidden="true" />
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 text-destructive"
                                onClick={() => onRemove(entry.block, entry.service.id)}
                                aria-label={`Remover ${entry.service.id} da seleção`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3 border-t border-border/50 bg-muted/20 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {totalLabel}
            </span>
            <span className="text-lg font-bold">
              {total != null ? formatAmount(total) : "A confirmar com a agência"}
            </span>
          </div>
          {validationError && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {validationError}
            </p>
          )}
          <Button
            type="button"
            size="lg"
            className="min-h-[48px] w-full gap-2"
            onClick={onSubmit}
            disabled={!!validationError}
          >
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {ctaLabel}
          </Button>
          <p className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{BOOKING_REQUEST_DISCLAIMER}</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface BarProps {
  count: number;
  totalLabel: string;
  total: number | null;
  formatAmount: (value: number) => string;
  onOpen: () => void;
}

/**
 * Barra inferior fixa (mobile): contador + acesso ao resumo.
 * Nunca cobre conteúdo — a página reserva espaço equivalente.
 */
export function MySelectionBar({ count, totalLabel, total, formatAmount, onOpen }: BarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);

  // Publica presença + altura real para que o WhatsApp flutuante suba acima.
  useEffect(() => {
    const el = barRef.current;
    const sync = () => setBookingSelectionBarActive(true, el?.offsetHeight);
    sync();
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(sync);
      observer.observe(el);
    }
    return () => {
      observer?.disconnect();
      setBookingSelectionBarActive(false);
    };
  }, []);

  return (
    <div
      ref={barRef}
      data-testid="my-selection-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_-20px_rgba(0,0,0,0.4)] backdrop-blur lg:hidden"
    >

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Minha seleção · {count} {count === 1 ? "serviço" : "serviços"}
          </p>
          <p className="truncate text-sm font-bold">
            {total != null ? `${totalLabel}: ${formatAmount(total)}` : totalLabel}
          </p>
        </div>
        <Button type="button" className="min-h-[44px] shrink-0 gap-2" onClick={onOpen}>
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Ver seleção
        </Button>
      </div>
    </div>
  );
}
