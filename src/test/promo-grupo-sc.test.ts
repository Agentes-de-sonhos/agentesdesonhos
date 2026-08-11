import { describe, it, expect } from "vitest";
import { buildSubscriptionPayloadForLink, addMonthsUtc, isPromoPlan } from "@/lib/promoPlans";
import {
  PLAN_FEATURES, AI_LIMITS, PLAN_LABELS, resolveEffectivePlan,
} from "@/types/subscription";
import { PAID_PLANS } from "@/lib/subscriptionState";
import { shouldApplyPremiumFundadorFilter } from "@/lib/sidebarVisibility";

describe("Promoção Grupo SC", () => {
  it("herda exatamente os recursos e limites do Premium", () => {
    expect(PLAN_FEATURES.promo_grupo_sc).toEqual(PLAN_FEATURES.premium);
    expect(AI_LIMITS.promo_grupo_sc).toBe(AI_LIMITS.premium);
    expect(resolveEffectivePlan("promo_grupo_sc")).toBe("premium");
  });

  it("tem nome amigável e é tratado como plano pago", () => {
    expect(PLAN_LABELS.promo_grupo_sc).toBe("Promoção Grupo SC");
    expect(PAID_PLANS).toContain("promo_grupo_sc");
    expect(shouldApplyPremiumFundadorFilter(false, "promo_grupo_sc")).toBe(true);
  });

  it("grava 3 meses a partir da ativação", () => {
    const activation = new Date("2026-08-11T21:00:00.000Z");
    const payload = buildSubscriptionPayloadForLink("promo_grupo_sc", activation);
    expect(payload.plan).toBe("promo_grupo_sc");
    expect(payload.started_at).toBe(activation.toISOString());
    expect(payload.expires_at).toBe("2026-11-11T21:00:00.000Z");
    expect(payload.is_active).toBe(true);
  });

  it("ajusta meses curtos sem estourar o dia", () => {
    expect(addMonthsUtc(new Date("2026-11-30T12:00:00.000Z"), 3).toISOString())
      .toBe("2027-02-28T12:00:00.000Z");
  });

  it("não altera planos não promocionais nem usa a validade do link", () => {
    expect(isPromoPlan("premium")).toBe(false);
    expect(buildSubscriptionPayloadForLink("profissional")).toEqual({ plan: "profissional" });
  });
});
