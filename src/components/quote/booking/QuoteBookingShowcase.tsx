import { useState } from "react";
import { AlertCircle, Lock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookingServiceCard } from "@/components/quote/booking/BookingServiceCard";
import { BookingServiceDetails } from "@/components/quote/booking/BookingServiceDetails";
import {
  blockStatus,
  blockValidation,
  cardAction,
  sectionMetaChips,
  type ShowcaseBlock,
  type ShowcaseModel,
} from "@/lib/quoteBookingShowcase";
import type { QuoteService } from "@/types/quote";

interface Props {
  showcase: ShowcaseModel;
  selected: string[];
  hideAmounts: boolean;
  formatAmount: (value: number) => string;
  onToggle: (block: ShowcaseBlock, serviceId: string) => void;
  /** Mostra as mensagens de validação (após tentativa de envio). */
  showErrors: boolean;
}

const toneClass: Record<string, string> = {
  neutral: "border-border/60 text-muted-foreground",
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  done: "border-primary/40 bg-primary/10 text-primary",
};

/**
 * Vitrine pública: explorar → comparar → selecionar.
 * Não existe fluxo obrigatório de "quero/não quero": o cliente navega livremente.
 */
export function QuoteBookingShowcase({
  showcase,
  selected,
  hideAmounts,
  formatAmount,
  onToggle,
  showErrors,
}: Props) {
  const [details, setDetails] = useState<QuoteService | null>(null);

  const amountLabel = (service: QuoteService): string | null => {
    if (hideAmounts) return null;
    const amount = Number((service as any).amount) || 0;
    return amount > 0 ? formatAmount(amount) : null;
  };

  let lastSectionKey: string | null = null;

  return (
    <div className="space-y-5">
      {showcase.blocks.map((block) => {
        const status = blockStatus(block, selected);
        const error = showErrors ? blockValidation(block, selected) : null;
        const action = cardAction(block);
        const sectionKey = block.sectionId ?? "__root__";
        const showSectionHeader = sectionKey !== lastSectionKey && !!block.sectionTitle;
        lastSectionKey = sectionKey;
        const chips = sectionMetaChips(block.sectionMeta);

        return (
          <div key={block.key} className="space-y-3">
            {showSectionHeader && (
              <div className="space-y-1 border-b border-border/50 pb-2">
                <p className="text-sm font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
                  {block.sectionTitle}
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

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground [overflow-wrap:anywhere]">
                  {block.kind === "included" && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                  {block.kind === "choice" ? block.title : block.kind === "included" ? block.title : "Serviço opcional"}
                </p>
                <Badge variant="outline" className={cn("text-[10px]", toneClass[status.tone])}>
                  {status.label}
                </Badge>
              </div>

              {block.kind === "choice" && (
                <p className="text-[12px] text-muted-foreground">
                  {block.group?.group_type === "alternative"
                    ? "Escolha 1 opção. Ao selecionar outra, a troca é automática."
                    : "Você pode selecionar mais de uma opção."}
                </p>
              )}

              <div
                className={cn(
                  "grid gap-3",
                  block.options.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1",
                )}
              >
                {block.options.map((option) => (
                  <BookingServiceCard
                    key={option.service.id}
                    service={option.service}
                    optionNumber={option.optionNumber}
                    action={action}
                    selected={selected.includes(option.service.id) || action === "locked"}
                    amountLabel={amountLabel(option.service)}
                    onToggle={() => onToggle(block, option.service.id)}
                    onDetails={() => setDetails(option.service)}
                  />
                ))}
              </div>

              {error && (
                <p
                  className="flex items-start gap-1.5 text-xs font-medium text-destructive"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <BookingServiceDetails
        service={details}
        amountLabel={details ? amountLabel(details) : null}
        onClose={() => setDetails(null)}
      />
    </div>
  );
}
