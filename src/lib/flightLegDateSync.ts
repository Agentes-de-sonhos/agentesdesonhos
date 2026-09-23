/**
 * Mantém o 1º trecho alinhado à data principal escolhida no calendário.
 * Atualiza só quando o trecho está vazio, era igual à data anterior ou tem o
 * mesmo dia/mês com outro ano (ex.: calendário 27/02/2027 e trecho 27/02/2026).
 * Datas de trecho diferentes, digitadas pelo agente, são preservadas.
 * Opera sempre em strings "YYYY-MM-DD" (sem fuso horário).
 */
export function syncFirstLegDate<T extends { leg_date?: string }>(
  legs: T[] | undefined,
  prev: string | undefined,
  next: string,
): T[] | undefined {
  if (!legs?.length || !/^\d{4}-\d{2}-\d{2}$/.test(next)) return legs;
  const cur = legs[0].leg_date || "";
  const sameDayOtherYear = /^\d{4}-\d{2}-\d{2}$/.test(cur) && cur.slice(5) === next.slice(5) && cur !== next;
  if (cur && cur !== prev && !sameDayOtherYear) return legs;
  if (cur === next) return legs;
  return legs.map((l, i) => (i === 0 ? { ...l, leg_date: next } : l));
}
