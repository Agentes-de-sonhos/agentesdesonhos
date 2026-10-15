import type { TripFlightData, TripFlightSegment } from "@/types/trip";

export function publicFlightRoute(data: Partial<TripFlightData>) {
  const segments = data.segments || [];
  const first = segments[0];
  const returnIndex = segments.findIndex((s) => s.segment_type === "volta");
  const outbound = returnIndex > 0 ? segments.slice(0, returnIndex) : segments;
  let end = outbound[outbound.length - 1];
  // Legacy/imported round trips can contain a final return without a type.
  if (data.trip_type === "ida_volta" && first && end?.destination_airport === first.origin_airport && outbound.length > 1) {
    end = outbound[outbound.length - 2];
  }
  const origin = data.origin_city || first?.origin_city || first?.origin_airport || "";
  const storedDestination = data.destination_city;
  const destination = storedDestination && storedDestination !== origin
    ? storedDestination : end?.destination_city || end?.destination_airport || "";
  return { origin, destination, roundTrip: data.trip_type === "ida_volta" || returnIndex > 0 };
}

export function publicFlightSegments(data: Partial<TripFlightData>): Partial<TripFlightSegment>[] {
  if (data.segments?.length) return data.segments;
  if (!data.departure_date && !data.origin_city && !data.destination_city) return [];
  const outbound: Partial<TripFlightSegment> = {
    origin_city: data.origin_city, destination_city: data.destination_city,
    airline: data.main_airline || data.airline, flight_date: data.departure_date, segment_type: "ida",
  };
  return data.return_date && data.trip_type !== "ida"
    ? [outbound, { ...outbound, origin_city: data.destination_city, destination_city: data.origin_city, flight_date: data.return_date, segment_type: "volta" }]
    : [outbound];
}