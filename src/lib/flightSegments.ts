import type { FlightLegDetail, SegmentType } from "@/types/quote";

export const SEGMENT_TYPE_OPTIONS: { value: SegmentType; label: string }[] = [
  { value: "outbound", label: "Ida" },
  { value: "outbound_connection", label: "Conexão" },
  { value: "internal", label: "Voo interno" },
  { value: "return_connection", label: "Conexão da volta" },
  { value: "return", label: "Volta" },
  { value: "other", label: "Outro" },
];

export function segmentLabel(t?: SegmentType | string | null): string {
  if (!t) return "—";
  return SEGMENT_TYPE_OPTIONS.find(o => o.value === t)?.label || "—";
}

/** Returns the hour gap between arrival of leg A and departure of leg B, or null if unknown. */
function gapHours(a: { leg_date?: string; arrival_time?: string }, b: { leg_date?: string; departure_time?: string }): number | null {
  if (!a?.leg_date || !b?.leg_date) return null;
  try {
    const [ay, am, ad] = a.leg_date.split("-").map(Number);
    const [by, bm, bd] = b.leg_date.split("-").map(Number);
    if (!ay || !by) return null;
    const [ah, ami] = (a.arrival_time || "00:00").split(":").map(Number);
    const [bh, bmi] = (b.departure_time || "00:00").split(":").map(Number);
    const aDate = new Date(ay, am - 1, ad, ah || 0, ami || 0);
    const bDate = new Date(by, bm - 1, bd, bh || 0, bmi || 0);
    return (bDate.getTime() - aDate.getTime()) / 3_600_000;
  } catch {
    return null;
  }
}

/**
 * Automatically classify each flight segment in chronological order.
 * Heuristic:
 * - first leg → outbound
 * - last leg returning to origin IATA → return
 * - middle legs with short layover (<24h) → connection (outbound or return)
 * - middle legs with longer stay → internal
 * The leg right before the return-home leg with short gap is flagged return_connection.
 */
export function classifySegments<T extends Pick<FlightLegDetail, "airport_origin" | "airport_destination" | "leg_date" | "departure_time" | "arrival_time">>(
  legs: T[],
): SegmentType[] {
  const n = legs.length;
  if (n === 0) return [];
  const result: SegmentType[] = new Array(n).fill("internal");
  if (n === 1) return ["outbound"];

  const originIATA = (legs[0].airport_origin || "").toUpperCase();
  result[0] = "outbound";

  // Find the LAST leg whose destination returns to the origin airport.
  let returnIdx = -1;
  if (originIATA) {
    for (let i = n - 1; i >= 1; i--) {
      if ((legs[i].airport_destination || "").toUpperCase() === originIATA) {
        returnIdx = i;
        break;
      }
    }
  }
  if (returnIdx >= 0) result[returnIdx] = "return";

  for (let i = 1; i < n; i++) {
    if (i === returnIdx) continue;
    const gap = gapHours(legs[i - 1], legs[i]);
    const isShort = gap !== null && gap < 24;
    if (returnIdx === -1 || i < returnIdx) {
      result[i] = isShort ? "outbound_connection" : "internal";
    } else {
      result[i] = isShort ? "return_connection" : "internal";
    }
  }

  // Promote the leg right before "return" to "return_connection" when the layover is short.
  if (returnIdx > 1) {
    const gap = gapHours(legs[returnIdx - 1], legs[returnIdx]);
    if (gap !== null && gap < 24) result[returnIdx - 1] = "return_connection";
  }

  return result;
}