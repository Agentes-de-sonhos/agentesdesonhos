/**
 * Returns true if a "YYYY-MM-DD" date string falls within the given month/year.
 * Safe to use with timezone-sensitive ISO dates because it parses the string directly.
 */
export function isInMonth(
  dateStr: string | null | undefined,
  month: number, // 1-12
  year: number,
): boolean {
  if (!dateStr) return false;
  const m = String(month).padStart(2, "0");
  return dateStr.startsWith(`${year}-${m}`);
}

/**
 * Returns true if any of the provided date strings match the month/year.
 */
export function anyInMonth(
  dates: Array<string | null | undefined>,
  month: number,
  year: number,
): boolean {
  return dates.some(d => isInMonth(d, month, year));
}