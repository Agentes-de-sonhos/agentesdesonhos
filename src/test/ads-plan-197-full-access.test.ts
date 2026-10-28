import { describe, it, expect } from "vitest";
import { PLAN_FEATURES, AI_LIMITS } from "@/types/subscription";
import { isAdsEssencialGestaoMenuUser } from "@/lib/sidebarVisibility";

describe("plano ADS Essencial + Gestão Equipe (R$ 197)", () => {
  it("libera todos os recursos, igual ao Premium", () => {
    expect(PLAN_FEATURES.ads_essencial_gestao_equipe).toEqual(PLAN_FEATURES.premium);
  });
  it("tem cota de IA de 1000", () => {
    expect(AI_LIMITS.ads_essencial_gestao_equipe).toBe(1000);
  });
  it("mostra o menu completo", () => {
    expect(isAdsEssencialGestaoMenuUser(false, "ads_essencial_gestao_equipe")).toBe(false);
  });
  it("plano de R$ 167 continua restrito", () => {
    expect(isAdsEssencialGestaoMenuUser(false, "ads_essencial_gestao")).toBe(true);
    expect(PLAN_FEATURES.ads_essencial_gestao).not.toContain("news");
  });
});
