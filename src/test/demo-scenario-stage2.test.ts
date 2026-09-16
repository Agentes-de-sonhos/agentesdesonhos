import { describe, expect, it } from "vitest";
import {
  offsetDate,
  paymentSummary,
  publicSafeTraveler,
  saleProductType,
  SCENARIO_CLIENT,
  SCENARIO_ITINERARY,
  SCENARIO_SERVICES,
  SCENARIO_TRAVELERS,
  servicesTotal,
  TRIP_ADULTS,
  TRIP_CHILDREN,
  TRIP_DAYS,
  TRIP_NIGHTS,
  TRIP_TOTAL,
} from "../../supabase/functions/casanova-provision/scenario-data";

describe("Casa Nova — cenário demonstrativo (Etapa 2)", () => {
  it("tem exatamente os oito serviços aprovados e a soma fecha com o total da viagem", () => {
    expect(SCENARIO_SERVICES).toHaveLength(8);
    expect(servicesTotal()).toBe(TRIP_TOTAL);
  });

  it("usa chaves naturais únicas para garantir idempotência dos serviços", () => {
    const keys = SCENARIO_SERVICES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("descreve a viagem como 8 dias / 7 noites para 2 adultos", () => {
    expect(TRIP_DAYS).toBe(8);
    expect(TRIP_NIGHTS).toBe(7);
    expect(TRIP_ADULTS).toBe(2);
    expect(TRIP_CHILDREN).toBe(0);
    expect(SCENARIO_ITINERARY).toHaveLength(8);
    expect(SCENARIO_ITINERARY.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("todo dia do roteiro tem atividades com período válido", () => {
    for (const day of SCENARIO_ITINERARY) {
      expect(day.activities.length).toBeGreaterThan(0);
      for (const act of day.activities) {
        expect(["manha", "tarde", "noite"]).toContain(act.period);
        expect(act.title.length).toBeGreaterThan(0);
      }
    }
  });

  it("registra pagamento parcial coerente (entrada de 30%)", () => {
    const p = paymentSummary();
    expect(p.status).toBe("parcial");
    expect(p.paid).toBeGreaterThan(0);
    expect(p.paid + p.remaining).toBe(TRIP_TOTAL);
  });

  it("traz Ana como responsável e Roberto como acompanhante, com documentos fictícios", () => {
    expect(SCENARIO_TRAVELERS).toHaveLength(2);
    const [ana, roberto] = SCENARIO_TRAVELERS;
    expect(ana.nome_completo).toBe(SCENARIO_CLIENT.name);
    expect(ana.is_responsavel).toBe(true);
    expect(roberto.is_responsavel).toBe(false);
    for (const t of SCENARIO_TRAVELERS) {
      expect(t.passaporte.startsWith("DEMO")).toBe(true);
    }
  });

  it("não expõe documentos sensíveis nas superfícies do cliente", () => {
    const safe = publicSafeTraveler(SCENARIO_TRAVELERS[0]);
    expect(safe).not.toHaveProperty("cpf");
    expect(safe).not.toHaveProperty("passaporte");
    expect(safe.nome_completo).toBe("Ana Martins");
  });

  it("converte ingresso para um tipo de produto aceito na venda", () => {
    expect(saleProductType("ingresso")).toBe("atracao");
    expect(saleProductType("hotel")).toBe("hotel");
  });

  it("calcula datas relativas dentro da janela da viagem", () => {
    const start = new Date("2026-06-01T00:00:00Z");
    expect(offsetDate(start, 0)).toBe("2026-06-01");
    expect(offsetDate(start, TRIP_NIGHTS)).toBe("2026-06-08");
    for (const s of SCENARIO_SERVICES) {
      expect(s.dayFrom).toBeGreaterThanOrEqual(0);
      expect(s.dayTo).toBeLessThanOrEqual(TRIP_NIGHTS);
      expect(s.dayTo).toBeGreaterThanOrEqual(s.dayFrom);
    }
  });

  it("mantém o perfil do cliente principal amplamente preenchido", () => {
    expect(SCENARIO_CLIENT.email).toContain("demo");
    expect(SCENARIO_CLIENT.travel_preferences.length).toBeGreaterThan(20);
    expect(SCENARIO_CLIENT.legacyNames).toContain("Ana e Roberto Martins");
  });
});
