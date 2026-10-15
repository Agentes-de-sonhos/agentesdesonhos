/** Converte "YYYY-MM-DD" (ou início ISO) em Date local, sem desvio de fuso. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)?$)/.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Formata data como DD/MM/AAAA sem perder um dia por fuso horário. */
export function formatLocalDateBR(value: string | null | undefined, fallback = "—"): string {
  const d = parseLocalDate(value);
  if (!d) return value || fallback;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
