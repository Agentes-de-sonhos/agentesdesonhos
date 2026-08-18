import { serviceCompactDigest } from "@/lib/quoteServiceDigest";
import { ResolvedServiceImage } from "@/components/quote/ResolvedServiceImage";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import type { QuoteService } from "@/types/quote";

/**
 * Bloco compacto compartilhado pelos resumos do fluxo de reserva
 * ("Suas escolhas", revisão do wizard e pop-up final): tipo, nome real,
 * localização e linhas de datas. Sem descrições longas ou detalhes
 * secundários — apenas o que identifica o serviço.
 */
export function ServiceDigestCompact({
  service,
  withThumb = false,
}: {
  service: QuoteService;
  withThumb?: boolean;
}) {
  const digest = serviceCompactDigest(service);
  const thumb = withThumb ? digest.images[0] : undefined;

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {thumb && (
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          <ResolvedServiceImage
            src={thumb}
            alt={digest.title}
            placeId={resolveServicePlaceId(service)}
            className="h-full w-full max-w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">
          {digest.typeLabel}
        </p>
        <p className="break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
          {digest.title}
        </p>
        {digest.location && (
          <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {digest.location}
          </p>
        )}
        {digest.dateLines.map((line) => (
          <p key={line.label} className="break-words text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{line.label}:</span> {line.value}
          </p>
        ))}
        {digest.quantity && (
          <p className="text-xs text-muted-foreground">{digest.quantity}</p>
        )}
      </div>
    </div>
  );
}
