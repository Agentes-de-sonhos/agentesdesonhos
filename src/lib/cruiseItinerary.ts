/**
 * Normalization helpers for the cruise itinerary array stored in
 * `service_data.itinerary` of a quote's cruise service.
 *
 * Read-only/presentational: never mutates or reorders the source array.
 */

export type CruiseStopType = "embarque" | "porto" | "navegacao" | "desembarque";

export interface CruiseStop {
  date: string | null;
  port: string | null;
  stopType: CruiseStopType | null;
  arrivalTime: string | null;
  departureTime: string | null;
  note: string | null;
}

const STOP_TYPE_LABELS: Record<CruiseStopType, string> = {
  embarque: "Embarque",
  porto: "Porto / Parada",
  navegacao: "Navegação",
  desembarque: "Desembarque",
};

export function cruiseStopTypeLabel(stopType: string | null | undefined): string | null {
  if (!stopType) return null;
  return STOP_TYPE_LABELS[stopType as CruiseStopType] ?? null;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Turns a raw itinerary array into a safe list of stops, preserving order.
 * Malformed/empty entries are dropped without throwing.
 */
export function normalizeCruiseItinerary(raw: unknown): CruiseStop[] {
  if (!Array.isArray(raw)) return [];
  const stops: CruiseStop[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const date = str(o.date);
    const port = str(o.port);
    const rawType = str(o.stop_type)?.toLowerCase() ?? null;
    const stopType = rawType && rawType in STOP_TYPE_LABELS ? (rawType as CruiseStopType) : null;
    const arrivalTime = str(o.arrival_time);
    const departureTime = str(o.departure_time);

    const notes = str(o.notes);
    const description = str(o.description);
    // Avoid duplicating the same text when both fields carry it.
    const note =
      notes && description
        ? notes === description
          ? notes
          : `${notes}\n${description}`
        : notes ?? description;

    // Nothing meaningful to show → skip.
    if (!date && !port && !stopType && !arrivalTime && !departureTime && !note) continue;

    stops.push({ date, port, stopType, arrivalTime, departureTime, note });
  }

  return stops;
}

/** Display label for the stop's location, falling back to "Navegação" at sea. */
export function cruiseStopTitle(stop: CruiseStop): string | null {
  if (stop.port) return stop.port;
  if (stop.stopType === "navegacao") return "Navegação";
  return cruiseStopTypeLabel(stop.stopType);
}
