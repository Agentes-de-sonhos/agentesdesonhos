/**
 * Planos promocionais com vigência fixa (pagamento manual externo).
 * A vigência conta a partir da ATIVAÇÃO (resgate do link), nunca da criação do link.
 */
export const PROMO_PLAN_MONTHS: Record<string, number> = {
  promo_grupo_sc: 3,
};

export function isPromoPlan(plan: string | null | undefined): boolean {
  return !!plan && plan in PROMO_PLAN_MONTHS;
}

/** Soma meses preservando o dia; ajusta para o último dia quando o mês é mais curto. */
export function addMonthsUtc(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Payload de assinatura para o resgate de um link de cadastro manual.
 * Para planos promocionais grava started_at = ativação e expires_at = +N meses.
 * A data de expiração do LINK nunca é usada aqui — são conceitos separados.
 */
export function buildSubscriptionPayloadForLink(
  plan: string,
  activatedAt: Date = new Date(),
): Record<string, string | boolean> {
  const payload: Record<string, string | boolean> = { plan };
  const months = PROMO_PLAN_MONTHS[plan];
  if (months) {
    payload.started_at = activatedAt.toISOString();
    payload.expires_at = addMonthsUtc(activatedAt, months).toISOString();
    payload.is_active = true;
  }
  return payload;
}
