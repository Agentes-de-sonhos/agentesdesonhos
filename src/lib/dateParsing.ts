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
