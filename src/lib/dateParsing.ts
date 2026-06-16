/**
 * Date parsing helpers that avoid the common UTC-shift bug.
 *
 * Problem: `new Date("2026-07-11")` is parsed as UTC midnight by JavaScript.
 * In Brazil (GMT-3) that becomes 2026-07-10 21:00 local time, so any
 * subsequent `format(date, "dd/MM/yyyy")` call shows D-1.
 *
 * Always use `parseLocalDate` (or `parseLocalDateSafe` when the input may be
 * null/undefined) when reading date-only strings ("YYYY-MM-DD") from the
 * database or APIs that need to be displayed in local time.
 */

/**
 * Parse a "YYYY-MM-DD" string as a local-time Date (midnight in the user's
 * timezone). Throws on malformed input — use `parseLocalDateSafe` for
 * tolerant parsing.
 */
export function parseLocalDate(dateStr: string): Date {
  // Tolerate full ISO timestamps by trimming the time portion.
  const datePart = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return new Date(y, m - 1, d);
}

/**
 * Parse a date-only string into a local Date. Returns `null` for empty,
 * undefined, or malformed inputs — safe to use directly in JSX.
 */
export function parseLocalDateSafe(
  dateStr: string | null | undefined
): Date | null {
  if (!dateStr) return null;
  try {
    return parseLocalDate(dateStr);
  } catch {
    return null;
  }
}

/**
 * Capitalize only the first letter of a string, preserving the rest
 * (so "segunda-feira" → "Segunda-feira", not "Segunda-Feira").
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Standard Portuguese day header used in itineraries / day-by-day views.
 * Example: "Segunda-feira, 13 de Julho".
 *
 * Built manually (instead of `format(... "EEEE, dd 'de' MMMM")` + CSS
 * `capitalize`) so that compound weekdays keep natural casing:
 *   - "Segunda-feira" (correct) vs "Segunda-Feira" (wrong)
 *   - "de" stays lowercase
 *   - Month is capitalized (e.g. "Julho")
 */
export function formatItineraryDayHeader(date: Date): string {
  const weekdays = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const weekday = weekdays[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  return `${weekday}, ${day} de ${month}`;
}
