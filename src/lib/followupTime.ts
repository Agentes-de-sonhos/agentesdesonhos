/**
 * Horário de follow-up (piloto 0.4 da extensão).
 *
 * Follow-ups antigos possuem apenas `follow_up_date` (dia inteiro).
 * Follow-ups novos podem trazer `follow_up_at` (timestamptz) + `time_zone`,
 * e nesse caso a Agenda deve mostrar o horário marcado.
 */

export const DEFAULT_FOLLOWUP_TIME_ZONE = 'America/Sao_Paulo';

/** Retorna "HH:mm" no fuso do follow-up, ou null quando é legado (all-day). */
export function followupEventTime(
  followUpAt: string | null | undefined,
  timeZone: string | null | undefined,
): string | null {
  if (!followUpAt) return null;
  const instant = new Date(followUpAt);
  if (Number.isNaN(instant.getTime())) return null;
  const zone = timeZone || DEFAULT_FOLLOWUP_TIME_ZONE;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(instant);
  } catch {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: DEFAULT_FOLLOWUP_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(instant);
  }
}

/** Data civil "AAAA-MM-DD" do follow-up no fuso informado. */
export function followupCivilDate(
  followUpAt: string | null | undefined,
  timeZone: string | null | undefined,
  fallbackDate: string,
): string {
  if (!followUpAt) return fallbackDate;
  const instant = new Date(followUpAt);
  if (Number.isNaN(instant.getTime())) return fallbackDate;
  const zone = timeZone || DEFAULT_FOLLOWUP_TIME_ZONE;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    return fallbackDate;
  }
}
