/**
 * Pré-preenchimento inteligente dos formulários manuais de serviço.
 *
 * As sugestões vêm apenas do que já está no orçamento (destino, datas,
 * passageiros). São sempre editáveis, nunca tornam um campo obrigatório e só
 * aparecem quando a correspondência é segura: com vários destinos, nenhum campo
 * de cidade é sugerido até o destino correto ser escolhido.
 */

export interface QuotePrefillContext {
  destination?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  adults?: number | null;
  children?: number | null;
}

export interface ServicePrefill {
  destination_city?: string;
  city?: string;
  location?: string;
  pickup_location?: string;
  dropoff_location?: string;
  adults?: number;
  children?: number;
  start_date?: Date;
  end_date?: Date;
}

/** Separa "Orlando, Miami e Nova York" em destinos individuais. */
export function splitDestinations(destination?: string | null): string[] {
  if (!destination || typeof destination !== "string") return [];
  return destination
    .split(/,|;|\/|\se\s|\+/gi)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

/**
 * Destino a usar nas sugestões. Retorna `null` quando há mais de um destino e
 * nenhum foi escolhido — nesse caso nada é preenchido.
 */
export function resolvePrefillDestination(
  destination?: string | null,
  selected?: string | null,
): string | null {
  const chosen = (selected || "").trim();
  if (chosen) return chosen;
  const parts = splitDestinations(destination);
  if (parts.length === 1) return parts[0];
  return null;
}

export type PrefillServiceType =
  | "flight"
  | "hotel"
  | "car_rental"
  | "transfer"
  | "attraction"
  | "insurance"
  | "cruise"
  | "rail_transport"
  | "circuit"
  | "other";

/** Sugestões por tipo de serviço, apenas com correspondências seguras. */
export function buildServicePrefill(
  serviceType: PrefillServiceType,
  ctx: QuotePrefillContext,
  selectedDestination?: string | null,
): ServicePrefill {
  const city = resolvePrefillDestination(ctx.destination, selectedDestination);
  const start = ctx.startDate ?? undefined;
  const end = ctx.endDate ?? undefined;
  const adults = typeof ctx.adults === "number" && ctx.adults > 0 ? ctx.adults : undefined;
  const children = typeof ctx.children === "number" && ctx.children > 0 ? ctx.children : undefined;
  const pax = { adults, children };

  switch (serviceType) {
    case "flight":
      return { ...pax, ...(city ? { destination_city: city } : {}), start_date: start, end_date: end };
    case "hotel":
      return { ...pax, ...(city ? { city } : {}), start_date: start, end_date: end };
    case "car_rental":
      return city
        ? { ...pax, pickup_location: city, dropoff_location: city, start_date: start, end_date: end }
        : { ...pax, start_date: start, end_date: end };
    case "transfer":
    case "attraction":
      return { ...pax, ...(city ? { location: city } : {}), start_date: start, end_date: end };
    case "insurance":
      return { ...pax, start_date: start, end_date: end };
    default:
      // Demais tipos: apenas datas/passageiros, sem inferir lugares.
      return { ...pax, start_date: start, end_date: end };
  }
}
