import { Check, ChevronRight, Lock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResolvedServiceThumb } from "@/components/shared/ResolvedServiceImage";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import {
  serviceCompactDigest,
  serviceDigestHighlights,
} from "@/lib/quoteServiceDigest";
import type { CardAction } from "@/lib/quoteBookingShowcase";
import type { QuoteService } from "@/types/quote";

interface Props {
  service: QuoteService;
  /** "Opção N" dentro do conjunto (null quando avulso/incluído). */
  optionNumber: number | null;
  action: CardAction;
  selected: boolean;
  /** Valor exibido, já formatado. null quando os valores ficam ocultos. */
  amountLabel: string | null;
  onToggle: () => void;
  onDetails: () => void;
}

/**
 * Card comparável de um serviço na vitrine pública do orçamento.
 * Usa somente dados já cadastrados (digest compartilhado) — nunca duplica
 * cadastro e nunca usa linguagem de compra/checkout.
 */
export function BookingServiceCard({
  service,
  optionNumber,
  action,
  selected,
  amountLabel,
  onToggle,
  onDetails,
}: Props) {
  const digest = serviceCompactDigest(service);
  const highlights = serviceDigestHighlights(service);
  const locked = action === "locked";

  const actionLabel = locked
    ? "Incluído na proposta"
    : selected
      ? "Selecionado"
      : action === "radio"
        ? "Selecionar esta opção"
        : "Adicionar à seleção";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-3 rounded-2xl border bg-white p-3 transition-colors sm:p-4",
        selected ? "border-primary/60 bg-primary/[0.04]" : "border-border/60",
      )}
      data-selected={selected ? "true" : "false"}
      data-service-id={service.id}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20">
          <ResolvedServiceThumb
            imageRef={digest.images[0]}
            placeId={resolveServicePlaceId(service)}
            alt={digest.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {optionNumber != null && (
              <Badge variant="outline" className="text-[10px] font-semibold">
                Opção {optionNumber}
              </Badge>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {digest.typeLabel}
            </span>
          </div>
          <p className="text-sm font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
            {digest.title}
          </p>
          {digest.location && (
            <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{digest.location}</p>
          )}
          {digest.dateLines.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {digest.dateLines.map((l) => `${l.label}: ${l.value}`).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {highlights.map((h) => (
            <span
              key={h}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground [overflow-wrap:anywhere]"
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {digest.shortDescription && (
        <p className="text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {digest.shortDescription}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {amountLabel ? (
          <p className="text-sm font-bold text-foreground">{amountLabel}</p>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={onDetails}
          className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ver detalhes <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <Button
        type="button"
        variant={selected ? "default" : "outline"}
        className="min-h-[44px] w-full gap-2"
        onClick={onToggle}
        disabled={locked}
        aria-pressed={!locked ? selected : undefined}
      >
        {locked ? (
          <Lock className="h-4 w-4" aria-hidden="true" />
        ) : selected ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        {actionLabel}
      </Button>
      {selected && !locked && (
        <p className="text-center text-[11px] text-muted-foreground">
          {action === "radio"
            ? "Selecione outra opção para trocar."
            : "Toque novamente para remover da seleção."}
        </p>
      )}
    </div>
  );
}
