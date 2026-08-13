/**
 * Links de mapa e rota para serviços com localização confirmada.
 * Nunca expõe chaves: o mapa estático é servido pela Edge Function
 * `place-static-map`, que faz o proxy assinado no servidor.
 */

export interface MapPoint {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  name?: string | null;
  placeId?: string | null;
}

export function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function hasCoordinates(point: MapPoint): boolean {
  const lat = parseCoord(point.latitude);
  const lng = parseCoord(point.longitude);
  return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function destinationLabel(point: MapPoint): string {
  const lat = parseCoord(point.latitude);
  const lng = parseCoord(point.longitude);
  if (lat !== null && lng !== null) return `${lat},${lng}`;
  return [point.name, point.address].filter(Boolean).join(", ");
}

/** Rota no Google Maps (web e app), sempre a partir da localização atual. */
export function googleDirectionsUrl(point: MapPoint): string | null {
  const dest = destinationLabel(point);
  if (!dest) return null;
  const params = new URLSearchParams({ api: "1", destination: dest });
  if (point.placeId) params.set("destination_place_id", point.placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Visualização do local no Google Maps. */
export function googlePlaceUrl(point: MapPoint): string | null {
  if (point.placeId) {
    const q = encodeURIComponent([point.name, point.address].filter(Boolean).join(", ") || "hotel");
    return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(point.placeId)}`;
  }
  const dest = destinationLabel(point);
  if (!dest) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
}

/** Rota no Waze (só faz sentido com coordenadas). */
export function wazeDirectionsUrl(point: MapPoint): string | null {
  const lat = parseCoord(point.latitude);
  const lng = parseCoord(point.longitude);
  if (lat === null || lng === null) {
    const dest = [point.name, point.address].filter(Boolean).join(", ");
    return dest ? `https://waze.com/ul?q=${encodeURIComponent(dest)}&navigate=yes` : null;
  }
  return `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
}

export interface StaticMapOptions {
  width?: number;
  height?: number;
  zoom?: number;
  scale?: 1 | 2;
}

/** URL da imagem de mapa estático (proxy próprio, sem chave no cliente). */
export function staticMapUrl(
  point: MapPoint,
  supabaseUrl: string,
  options: StaticMapOptions = {},
): string | null {
  const lat = parseCoord(point.latitude);
  const lng = parseCoord(point.longitude);
  if (lat === null || lng === null || !supabaseUrl) return null;
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    w: String(Math.min(1280, Math.max(200, Math.round(options.width ?? 640)))),
    h: String(Math.min(1280, Math.max(120, Math.round(options.height ?? 260)))),
    zoom: String(Math.min(20, Math.max(1, Math.round(options.zoom ?? 15)))),
    scale: String(options.scale ?? 2),
  });
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/place-static-map?${params.toString()}`;
}