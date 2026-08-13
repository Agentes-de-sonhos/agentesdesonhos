import { useMemo, useState } from "react";
import { MapPin, Navigation, ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

  const mapSrcLarge = useMemo(
    () =>
      staticMapUrl(point, import.meta.env.VITE_SUPABASE_URL as string, {
        width: 1280,
        height: 1280,
        zoom: 16,
      }),
    [latitude, longitude],
  );
  const [expanded, setExpanded] = useState(false);

  const viewUrl = googlePlaceUrl(point);
  const routeUrl = googleDirectionsUrl(point);
  const wazeUrl = hasCoordinates(point) ? wazeDirectionsUrl(point) : null;

  if (!viewUrl && !routeUrl) return null;

  return (
    <div className={className}>
      {mapSrc && !imageFailed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="relative block w-full overflow-hidden rounded-2xl ring-1 ring-border/50 hover:ring-primary/40 transition"
          aria-label={`Ampliar mapa${name ? ` de ${name}` : ""}`}
        >
          <img
            src={mapSrc}
            alt={`Mapa da localização${name ? ` de ${name}` : ""}`}
            loading="lazy"
            className={compact ? "w-full h-32 object-cover" : "w-full h-40 sm:h-56 object-cover"}
            onError={() => setImageFailed(true)}
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
            <Maximize2 className="h-3 w-3" /> Ampliar
          </span>
        </button>
      )}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-3xl p-3 sm:p-4">
          <DialogTitle className="text-sm font-semibold">{name || "Localização"}</DialogTitle>
          {address && <p className="text-xs text-muted-foreground break-words">{address}</p>}
          {mapSrcLarge && !imageFailed && (
            <img
              src={mapSrcLarge}
              alt={`Mapa ampliado${name ? ` de ${name}` : ""}`}
              className="w-full rounded-xl object-cover max-h-[60vh]"
              onError={() => setImageFailed(true)}
            />
          )}
          <div className="flex flex-wrap gap-2">
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
                  <MapPin className="h-3 w-3 mr-1" /> Google Maps
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
        </DialogContent>
      </Dialog>
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