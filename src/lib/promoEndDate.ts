// Data limite da promoção de 50% OFF.
// Regra: sempre o último dia do mês corrente, às 23:59 (horário local).
// Rola automaticamente ao virar o mês, enquanto a campanha estiver ativa.

const MONTH_NAMES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function getPromoEndDate(reference: Date = new Date()): Date {
  // Dia 0 do próximo mês = último dia do mês atual
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 0, 0);
}

export function formatPromoEndDateLong(reference: Date = new Date()): string {
  const end = getPromoEndDate(reference);
  return `${end.getDate()} de ${MONTH_NAMES_PT[end.getMonth()]}`;
}