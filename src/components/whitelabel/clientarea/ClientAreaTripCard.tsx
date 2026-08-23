import { CalendarDays, Layers, MapPinned, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandText } from "@/components/ui/brand-text";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";
import {
  type ClientAreaTrip,
  tripPeriodLabel,
  tripServicesLabel,
  tripStatusLabel,
  tripTitle,
  tripTravelersLabel,
} from "@/lib/clientAreaTrips";

/**
 * Card de viagem: só mostra o que existe de verdade. Sem imagem cadastrada,
 * usa um fundo derivado das cores da agência — nunca uma foto genérica de
 * destino, que poderia representar a viagem incorretamente. Nenhum valor
 * financeiro é exibido nesta listagem.
 */
export function ClientAreaTripCard({
  trip,
  info,
  onOpen,
}: {
  trip: ClientAreaTrip;
  info: AgencyDomainInfo;
  onOpen: (id: string) => void;
}) {
  const title = tripTitle(trip);
  const period = tripPeriodLabel(trip);
  const services = tripServicesLabel(trip);
  const travelers = tripTravelersLabel(trip);
  const agency = agencyDisplayName(info);

  return (
    <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-36 w-full sm:h-40">
        {trip.cover_url ? (
          <img
            src={trip.cover_url}
            alt={`Capa da viagem ${title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/25 via-primary/10 to-muted"
          >
            <MapPinned className="h-8 w-8 text-primary/70" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
          {tripStatusLabel(trip)}
        </span>
      </div>

      <div className="space-y-3 p-5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground md:text-lg">{title}</h3>
          {trip.destination && trip.destination !== title ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{trip.destination}</p>
          ) : null}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{period}</span>
          </li>
          {services ? (
            <li className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{services}</span>
            </li>
          ) : null}
          {travelers ? (
            <li className="flex items-center gap-1.5">
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{travelers}</span>
            </li>
          ) : null}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <span className="truncate text-xs text-muted-foreground">
            <BrandText>{agency}</BrandText>
          </span>
          <Button
            className="min-h-11"
            onClick={() => onOpen(trip.id)}
            aria-label={`Ver viagem ${title}`}
          >
            Ver viagem
          </Button>
        </div>
      </div>
    </article>
  );
}
