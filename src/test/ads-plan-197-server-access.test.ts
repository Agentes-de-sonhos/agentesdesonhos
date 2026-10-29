import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLAN_FEATURES, AI_LIMITS } from "@/types/subscription";

const sql = readFileSync(join(process.cwd(), "drizzle/migrations/0058_ads_197_full_platform_access.sql"), "utf8");
const fullPlans = sql.match(/IF user_plan IN \(([^)]+)\) THEN\s+RETURN true;/)?.[1].match(/'([^']+)'/g)?.map(v => v.slice(1, -1)) ?? [];
const quotaCases = [...sql.matchAll(/WHEN '([^']+)' THEN monthly_limit := (\d+);/g)];
const quota = (plan: string) => Number(quotaCases.find(m => m[1] === plan)?.[2] ?? 0);
const reservationPlans = sql.match(/RETURN COALESCE\(v_plan, 'start'\) IN \(([^)]+)\)/)?.[1].match(/'([^']+)'/g)?.map(v => v.slice(1, -1)) ?? [];

describe("regras do servidor para o plano completo de R$ 197", () => {
  it("inclui todos os assinantes do plano, sem exceção por usuário", () => {
    expect(fullPlans).toContain("ads_essencial_gestao_equipe");
    expect(PLAN_FEATURES.ads_essencial_gestao_equipe).toContain("ai_tools");
    expect(sql).not.toContain("52195e1d-01cf-4ae9-9235-8a6c41d24007");
  });
  it("define 1.000 usos mensais também no servidor", () => {
    expect(quota("ads_essencial_gestao_equipe")).toBe(1000);
    expect(AI_LIMITS.ads_essencial_gestao_equipe).toBe(1000);
    expect(999 < quota("ads_essencial_gestao_equipe")).toBe(true);
    expect(1000 < quota("ads_essencial_gestao_equipe")).toBe(false);
  });
  it("libera a elegibilidade comercial de reservas e empresas", () => {
    expect(reservationPlans).toContain("ads_essencial_gestao_equipe");
  });
  it("mantém o plano de R$ 167 sem ferramentas de IA ou reservas completas", () => {
    expect(fullPlans).not.toContain("ads_essencial_gestao");
    expect(quota("ads_essencial_gestao")).toBe(0);
    expect(reservationPlans).not.toContain("ads_essencial_gestao");
  });
  it("mantém o consumo restrito ao usuário autenticado e à agência da equipe", () => {
    expect(sql).toContain("IF _user_id <> calling_user THEN");
    expect(sql).toContain("IF calling_user IS NULL THEN");
    expect(sql).toContain("m.auth_user_id = calling_user AND m.status = 'active'");
    expect(sql).toContain("WHERE user_id = owner_id AND is_active = true");
  });
});