/**
 * Regras de exibição/oferta para o plano promocional manual (promo_grupo_sc).
 *
 * A promoção está ENCERRADA para novas contratações: este helper nunca reoferece,
 * renova ou recalcula prazo. Ele apenas interpreta o que já está salvo em
 * `subscriptions` (plano + expires_at + is_active) para as telas de plano.
 *
 * Nada aqui altera gates de acesso (useSubscription/hasFeature/canUseAI).
 */
import {
  SubscriptionPlan,
  PROMO_PLAN_DURATION_MONTHS,
  resolveEffectivePlan,
} from "@/types/subscription";

export type PromoStatus = "none" | "active" | "expired" | "inactive" | "unknown";

export type PromoAccessState = {
  /** true quando o plano salvo é um plano promocional manual. */
  isPromo: boolean;
  status: PromoStatus;
  /** Fim do acesso promocional em pt-BR (dd/mm/aaaa) — null quando ausente/inválido. */
  endDateLabel: string | null;
  endsAt: Date | null;
};

export type PromoSubscriptionLike = {
  plan?: string | null;
  expires_at?: string | null;
  is_active?: boolean | null;
} | null | undefined;

const NONE: PromoAccessState = {
  isPromo: false,
  status: "none",
  endDateLabel: null,
  endsAt: null,
};

export function isPromoPlanId(plan: string | null | undefined): boolean {
  return !!plan && plan in PROMO_PLAN_DURATION_MONTHS;
}

/**
 * Interpreta o acesso promocional já contratado.
 * - `is_active === false` → inactive (não afirmar ativo).
 * - `expires_at` ausente/inválido → unknown (não inventar data nem presumir fim).
 * - `expires_at` no passado → expired.
 */
export function getPromoAccessState(
  subscription: PromoSubscriptionLike,
  now: Date = new Date(),
): PromoAccessState {
  const plan = subscription?.plan ?? null;
  if (!isPromoPlanId(plan)) return NONE;

  if (subscription?.is_active === false) {
    return { isPromo: true, status: "inactive", endDateLabel: null, endsAt: null };
  }

  const raw = subscription?.expires_at;
  if (typeof raw !== "string" || raw.trim() === "") {
    return { isPromo: true, status: "unknown", endDateLabel: null, endsAt: null };
  }
  const endsAt = new Date(raw);
  if (Number.isNaN(endsAt.getTime())) {
    return { isPromo: true, status: "unknown", endDateLabel: null, endsAt: null };
  }

  return {
    isPromo: true,
    status: endsAt.getTime() > now.getTime() ? "active" : "expired",
    endDateLabel: endsAt.toLocaleDateString("pt-BR"),
    endsAt,
  };
}

/** Promoção que ainda confere acesso (vigente ou sem data confiável). */
export function isPromoAccessCurrent(state: PromoAccessState): boolean {
  return state.isPromo && (state.status === "active" || state.status === "unknown");
}

export type PlanOfferInput = {
  /** true enquanto auth/assinatura carregam. */
  loading?: boolean;
  /** usuário autenticado (null = visitante). */
  hasUser?: boolean;
  /** plano bruto salvo. */
  plan?: string | null;
  subscription?: PromoSubscriptionLike;
  /** plano herdado da conta master (colaborador de equipe). */
  planInherited?: boolean;
  now?: Date;
};

export type PlanOfferState = {
  promo: PromoAccessState;
  /** Plano usado para hierarquia/igualdade nas telas de plano. */
  effectivePlan: SubscriptionPlan;
  /** true quando a promoção vigente já cobre os recursos do Premium. */
  coveredByPromo: boolean;
  /** true quando nenhuma contratação pode ser iniciada agora. */
  purchaseBlocked: boolean;
  blockedReason: "loading" | "promo_active" | "team_inherited" | null;
};

/**
 * Estado compartilhado por /planos e UpgradeDialog.
 * Promoção vigente = equivalente Premium (sem checkout). Promoção
 * expirada/inativa NÃO marca Premium como ativo e NÃO reoferece a promoção:
 * o usuário volta às opções tradicionais existentes.
 */
export function getPlanOfferState(input: PlanOfferInput): PlanOfferState {
  const rawPlan = input.plan ?? input.subscription?.plan ?? null;
  const promo = getPromoAccessState(
    input.subscription ?? (rawPlan ? { plan: rawPlan } : null),
    input.now,
  );
  const coveredByPromo = isPromoAccessCurrent(promo);

  let effectivePlan: SubscriptionPlan;
  if (promo.isPromo) {
    // Vigente → equivalente ao plano base (Premium). Encerrada → volta ao Start,
    // nunca marcando Premium como ativo.
    effectivePlan = coveredByPromo ? resolveEffectivePlan(rawPlan) : "start";
  } else {
    effectivePlan = (rawPlan as SubscriptionPlan) || "start";
  }

  let blockedReason: PlanOfferState["blockedReason"] = null;
  if (input.loading) blockedReason = "loading";
  else if (coveredByPromo) blockedReason = "promo_active";
  else if (input.hasUser && input.planInherited) blockedReason = "team_inherited";

  return {
    promo,
    effectivePlan,
    coveredByPromo,
    purchaseBlocked: blockedReason !== null,
    blockedReason,
  };
}
