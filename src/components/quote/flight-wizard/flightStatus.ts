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

export function computeFlightStatus(data: any, savedAsDraft = false): FlightStatus {
  if (savedAsDraft) return 'draft';
  if (!data) return 'incomplete';
  const hasMain =
    !!data.airline &&
    !!data.origin_city &&
    !!data.destination_city &&
    !!data.departure_date &&
    (data.is_one_way || !!data.return_date) &&
    Number(data.adult_price) > 0;
  return hasMain ? 'ready' : 'incomplete';
}