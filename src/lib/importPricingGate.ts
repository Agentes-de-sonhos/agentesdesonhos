import {
  isValidPricingDecision,
  PACKAGE_TOTAL_REQUIRED_MESSAGE,
  type QuotePricingMode,
} from "@/lib/quotePricing";

export interface PricingDecision {
  pricingMode: QuotePricingMode;
  packageTotal: number | null;
}

export type PricingGateResult =
  | { ok: true; persisted: boolean }
  | { ok: false; error: string };

/**
 * Portão de persistência da decisão de precificação da importação por IA.
 *
 * Garante que a decisão (soma dos serviços x valor fechado de pacote) seja
 * gravada ANTES do primeiro serviço ser confirmado — evitando que o recálculo
 * do total sobrescreva o valor fechado. Idempotente por assinatura.
 */
export function createPricingDecisionGate(
  persist: (decision: PricingDecision) => Promise<void> | void,
) {
  let persistedSignature: string | null = null;
  let inFlight: Promise<PricingGateResult> | null = null;

  const run = async (decision: PricingDecision): Promise<PricingGateResult> => {
    if (!isValidPricingDecision(decision)) {
      return { ok: false, error: PACKAGE_TOTAL_REQUIRED_MESSAGE };
    }
    const signature = `${decision.pricingMode}:${decision.packageTotal ?? ""}`;
    if (persistedSignature === signature) return { ok: true, persisted: false };
    try {
      await persist(decision);
      persistedSignature = signature;
      return { ok: true, persisted: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Não foi possível salvar o modo de cálculo do orçamento." };
    }
  };

  return {
    async ensure(decision: PricingDecision): Promise<PricingGateResult> {
      // Serializa chamadas concorrentes (cliques rápidos).
      const chain = (inFlight ?? Promise.resolve<PricingGateResult>({ ok: true, persisted: false }))
        .catch(() => ({ ok: true, persisted: false }) as PricingGateResult)
        .then(() => run(decision));
      inFlight = chain;
      return chain;
    },
    reset() {
      persistedSignature = null;
      inFlight = null;
    },
  };
}
