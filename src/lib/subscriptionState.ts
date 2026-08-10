/**
 * Derivação do estado de assinatura exibido em "Minha Conta".
 * Isolado do componente para permitir teste unitário.
 *
 * Regra do sistema: `expires_at` é preenchido pelo fluxo de cancelamento
 * (Edge Function `cancel-subscription` / webhook do Stripe). Portanto, uma
 * assinatura paga com `expires_at` no futuro e `stripe_subscription_id`
 * preenchido representa um CANCELAMENTO AGENDADO — o acesso segue até a data.
 */

export const PAID_PLANS = ["profissional", "premium", "fundador"] as const;

export type MinimalSubscription = {
  plan?: string | null;
  expires_at?: string | null;
  stripe_subscription_id?: string | null;
  is_active?: boolean | null;
} | null | undefined;

export function isPaidPlan(plan: unknown): boolean {
  return typeof plan === "string" && (PAID_PLANS as readonly string[]).includes(plan);
}

export type ScheduledCancellation = {
  scheduled: boolean;
  /** Fim do acesso em pt-BR (dd/mm/aaaa) quando agendado. */
  endDateLabel: string | null;
  endsAt: Date | null;
};

const NOT_SCHEDULED: ScheduledCancellation = {
  scheduled: false,
  endDateLabel: null,
  endsAt: null,
};

export function formatPtBrDate(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}

/**
 * @param subscription linha de public.subscriptions
 * @param now referência de "agora" (injetável para teste)
 */
export function getScheduledCancellation(
  subscription: MinimalSubscription,
  now: Date = new Date(),
): ScheduledCancellation {
  if (!subscription) return NOT_SCHEDULED;
  if (!isPaidPlan(subscription.plan)) return NOT_SCHEDULED;
  if (!subscription.stripe_subscription_id) return NOT_SCHEDULED;
  if (!subscription.expires_at) return NOT_SCHEDULED;

  const endsAt = new Date(subscription.expires_at);
  if (Number.isNaN(endsAt.getTime())) return NOT_SCHEDULED;
  if (endsAt.getTime() <= now.getTime()) return NOT_SCHEDULED;

  return {
    scheduled: true,
    endDateLabel: endsAt.toLocaleDateString("pt-BR"),
    endsAt,
  };
}
