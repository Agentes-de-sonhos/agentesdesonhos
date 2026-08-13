import { useMemo, useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  googleDirectionsUrl,
  googlePlaceUrl,
  hasCoordinates,
  staticMapUrl,
  wazeDirectionsUrl,
  type MapPoint,
} from "@/lib/mapLinks";

interface PlaceMapCardProps extends MapPoint {
  /** Altura do mapa em px (mobile). Desktop usa proporção maior. */
  compact?: boolean;
  className?: string;
}

/**
 * Mapa estático clicável + ações de rota. Degrada com elegância:
 * sem coordenadas (ou se a imagem falhar) mostra apenas os botões de link.
 */
export function PlaceMapCard({ latitude, longitude, address, name, placeId, compact, className }: PlaceMapCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const point: MapPoint = { latitude, longitude, address, name, placeId };

  const mapSrc = useMemo(
    () =>
      staticMapUrl(point, import.meta.env.VITE_SUPABASE_URL as string, {
        width: 1200,
        height: compact ? 320 : 420,
        zoom: 15,
      }),
    [latitude, longitude, compact],
  );

  const viewUrl = googlePlaceUrl(point);
  const routeUrl = googleDirectionsUrl(point);
  const wazeUrl = hasCoordinates(point) ? wazeDirectionsUrl(point) : null;

  if (!viewUrl && !routeUrl) return null;

  return (
    <div className={className}>
      {mapSrc && !imageFailed && (
        <a
          href={viewUrl ?? routeUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-2xl ring-1 ring-border/50 hover:ring-primary/40 transition"
          aria-label={`Abrir ${name || "local"} no Google Maps`}
        >
          <img
            src={mapSrc}
            alt={`Mapa da localização${name ? ` de ${name}` : ""}`}
            loading="lazy"
            className={compact ? "w-full h-32 object-cover" : "w-full h-40 sm:h-56 object-cover"}
            onError={() => setImageFailed(true)}
          />
        </a>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {routeUrl && (
          <a href={routeUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-8 rounded-full px-3 text-xs">
              <Navigation className="h-3 w-3 mr-1" /> Traçar rota
            </Button>
          </a>
        )}
        {viewUrl && (
          <a href={viewUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
              <MapPin className="h-3 w-3 mr-1" /> Ver no mapa
            </Button>
          </a>
        )}
        {wazeUrl && (
          <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
              <ExternalLink className="h-3 w-3 mr-1" /> Waze
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}