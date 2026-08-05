import { format } from "date-fns";
import { Anchor, MapPin, Ship, Flag } from "lucide-react";
import { parseLocalDateSafe } from "@/lib/dateParsing";
import {
  cruiseStopTitle,
  cruiseStopTypeLabel,
  normalizeCruiseItinerary,
  type CruiseStop,
} from "@/lib/cruiseItinerary";

function StopIcon({ stop }: { stop: CruiseStop }) {
  const cls = "h-3.5 w-3.5 text-primary";
  if (stop.stopType === "embarque") return <Anchor className={cls} />;
  if (stop.stopType === "desembarque") return <Flag className={cls} />;
  if (stop.stopType === "navegacao") return <Ship className={cls} />;
  return <MapPin className={cls} />;
}

/**
 * Vertical, compact timeline of the cruise itinerary for the public quote page.
 * Renders nothing when there is no valid stop.
 */
export default function CruiseItineraryTimeline({ itinerary }: { itinerary: unknown }) {
  const stops = normalizeCruiseItinerary(itinerary);
  if (stops.length === 0) return null;

  return (
    <section className="pt-4 mt-2 border-t border-border/50 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">
        Itinerário do cruzeiro
      </p>

      <ol className="relative space-y-3 pl-6 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
        {stops.map((stop, i) => {
          const date = parseLocalDateSafe(stop.date);
          const title = cruiseStopTitle(stop);
          const typeLabel = cruiseStopTypeLabel(stop.stopType);
          const showType = typeLabel && typeLabel !== title;

          return (
            <li key={i} className="relative">
              <span className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-1 ring-border">
                <StopIcon stop={stop} />
              </span>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {date && (
                  <span className="text-xs font-semibold tabular-nums text-foreground/70">
                    {format(date, "dd/MM/yyyy")}
                  </span>
                )}
                {title && (
                  <span className="text-sm font-semibold text-foreground">{title}</span>
                )}
                {showType && (
                  <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {typeLabel}
                  </span>
                )}
              </div>

              {(stop.arrivalTime || stop.departureTime) && (
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums">
                  {stop.arrivalTime && <span>Chegada: {stop.arrivalTime}</span>}
                  {stop.departureTime && <span>Saída: {stop.departureTime}</span>}
                </div>
              )}

              {stop.note && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {stop.note}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
