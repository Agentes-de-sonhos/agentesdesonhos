export type FlightStatus = 'draft' | 'incomplete' | 'ready';

export const FLIGHT_STATUS_LABEL: Record<FlightStatus, string> = {
  draft: 'Rascunho',
  incomplete: 'Incompleto',
  ready: 'Pronto para apresentar',
};

export const FLIGHT_STATUS_CLASS: Record<FlightStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  incomplete: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  ready: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
};

const hasText = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : !!v;
const legsWithDate = (legs: unknown) =>
  Array.isArray(legs) && legs.some((l: any) => hasText(l?.leg_date));

export interface FlightAnalysis {
  status: Exclude<FlightStatus, 'draft'>;
  missing: string[];
}

/**
 * Central analysis of what a flight service still needs to be presentable.
 * Accepts dates coming either from the top-level fields or from the legs,
 * and accepts pricing coming from unit prices or the service total amount.
 */
export function analyzeFlight(data: any, totalAmount?: number | null): FlightAnalysis {
  const missing: string[] = [];
  if (!data) {
    return {
      status: 'incomplete',
      missing: ['companhia aérea', 'cidade de origem', 'cidade de destino', 'data de ida', 'valor do serviço'],
    };
  }

  if (!hasText(data.airline)) missing.push('companhia aérea');
  if (!hasText(data.origin_city)) missing.push('cidade de origem');
  if (!hasText(data.destination_city)) missing.push('cidade de destino');

  const hasDeparture = hasText(data.departure_date) || legsWithDate(data.outbound_legs) || hasText(data.outbound_detail?.leg_date);
  if (!hasDeparture) missing.push('data de ida');

  if (!data.is_one_way) {
    const hasReturn = hasText(data.return_date) || legsWithDate(data.return_legs) || hasText(data.return_detail?.leg_date);
    if (!hasReturn) missing.push('data de volta');
  }

  const hasPrice =
    Number(data.adult_price) > 0 ||
    Number(data.child_price) > 0 ||
    Number(totalAmount) > 0;
  if (!hasPrice) missing.push('valor do serviço');

  return { status: missing.length ? 'incomplete' : 'ready', missing };
}

/** "falta: valor do serviço" / "faltam: data de volta, valor do serviço" */
export function formatMissingFlightFields(missing: string[]): string {
  if (!missing.length) return '';
  return `${missing.length === 1 ? 'falta' : 'faltam'}: ${missing.join(', ')}`;
}

export function computeFlightStatus(data: any, savedAsDraft = false, totalAmount?: number | null): FlightStatus {
  if (savedAsDraft) return 'draft';
  return analyzeFlight(data, totalAmount).status;
}
