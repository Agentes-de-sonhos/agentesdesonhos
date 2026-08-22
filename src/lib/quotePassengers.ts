import type { Quote, QuoteService } from "@/types/quote";

export interface PassengerComposition {
  adults: number;
  children: number;
  infants: number;
}

/** Formata contagens em texto natural com singular/plural e sem zeros. */
export function formatPassengerComposition(counts: PassengerComposition): string {
  const adults = Math.max(0, Number(counts.adults) || 0);
  const children = Math.max(0, Number(counts.children) || 0);
  const infants = Math.max(0, Number(counts.infants) || 0);

  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adulto${adults === 1 ? "" : "s"}`);
  if (children > 0) parts.push(`${children} criança${children === 1 ? "" : "s"}`);
  if (infants > 0) parts.push(`${infants} bebê${infants === 1 ? "" : "s"}`);

  if (parts.length === 0) return "Passageiros não informados";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

/**
 * Rótulo de composição de passageiros: "1 adulto", "2 adultos e 1 criança",
 * "2 adultos, 2 crianças e 1 bebê" etc. Singular/plural correto.
 */
export function buildPassengerLabel(quote: Quote): string {
  return formatPassengerComposition(quoteComposition(quote));
}

function quoteComposition(quote: Quote | undefined | null): PassengerComposition {
  return {
    adults: Number((quote as any)?.adults_count) || 0,
    children: Number((quote as any)?.children_count) || 0,
    infants: Number((quote as any)?.infants_count) || 0,
  };
}

function total(c: PassengerComposition) {
  return c.adults + c.children + c.infants;
}

/**
 * Composição de passageiros específica de um serviço, quando o serviço tem
 * fonte própria (quartos de hotel, composição tarifária de ingressos ou
 * contagens gravadas no service_data). Retorna null quando não há.
 */
export function resolveServicePassengerComposition(
  service: QuoteService | null | undefined,
): PassengerComposition | null {
  const data = (service as any)?.service_data as any;
  if (!data) return null;

  // Hospedagem com múltiplos apartamentos: soma por quarto × quantidade.
  const rooms: any[] | null = Array.isArray(data.rooms) ? (data.rooms as any[]) : null;
  if (rooms && rooms.length > 0) {
    const c = rooms.reduce(
      (acc: PassengerComposition, room: any) => {
        const qty = Math.max(1, Number(room?.quantity) || 1);
        acc.adults += (Number(room?.adults) || 0) * qty;
        acc.children += (Number(room?.children) || 0) * qty;
        return acc;
      },
      { adults: 0, children: 0, infants: 0 },
    );
    if (total(c) > 0) return c;
  }

  // Ingressos/atrações: composição tarifária real (adult/child por passageiro).
  const passengers = data.fare_composition?.passengers;
  if (Array.isArray(passengers) && passengers.length > 0) {
    const c = (passengers as any[]).reduce(
      (acc: PassengerComposition, p: any) => {
        if (p?.base === "child") acc.children += 1;
        else acc.adults += 1;
        return acc;
      },
      { adults: 0, children: 0, infants: 0 },
    );
    if (total(c) > 0) return c;
  }

  // Contagens explícitas no service_data (campos diretos ou *_count).
  const direct: PassengerComposition = {
    adults: Number(data.adults ?? data.adults_count) || 0,
    children: Number(data.children ?? data.children_count) || 0,
    infants: Number(data.infants ?? data.infants_count) || 0,
  };
  if (total(direct) > 0) return direct;

  return null;
}

/**
 * Rótulo "para quantos passageiros" de um serviço: prioriza a fonte do próprio
 * serviço e cai para a composição geral do orçamento. Retorna null quando não
 * há nenhuma informação de passageiros.
 */
export function buildServicePassengerLabel(
  service: QuoteService | null | undefined,
  quote?: Quote | null,
): string | null {
  const composition = resolveServicePassengerComposition(service) ?? quoteComposition(quote);
  if (total(composition) <= 0) return null;
  return formatPassengerComposition(composition);
}
