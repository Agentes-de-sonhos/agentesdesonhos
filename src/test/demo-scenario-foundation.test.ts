/**
 * Etapa 1 — fundação segura do cenário demonstrativo.
 * Garante que cleanup/reset atue SOMENTE sobre registros mapeados e que o
 * mapeamento seja idempotente (reexecutar não duplica).
 */
import { describe, it, expect } from "vitest";
import {
  CLEANUP_ORDER,
  SCENARIO_SLUG,
  cleanupPlan,
  isScenarioOwned,
  newMappings,
  type ScenarioRecord,
} from "../../supabase/functions/casanova-provision/scenario";

const rec = (t: string, id: string): ScenarioRecord => ({ table_name: t, record_id: id });

describe("cenário demonstrativo — identidade", () => {
  it("usa o slug do tenant Casa Nova Tur", () => {
    expect(SCENARIO_SLUG).toBe("casa-nova-tur");
  });
});

describe("cleanup mapeado", () => {
  it("remove dependentes antes das entidades base", () => {
    const plan = cleanupPlan([
      rec("clients", "c1"),
      rec("operations", "o1"),
      rec("operation_services", "os1"),
      rec("opportunities", "op1"),
    ]).map((s) => s.table);
    expect(plan.indexOf("operation_services")).toBeLessThan(plan.indexOf("operations"));
    expect(plan.indexOf("operations")).toBeLessThan(plan.indexOf("clients"));
    expect(plan.indexOf("opportunities")).toBeLessThan(plan.indexOf("clients"));
  });

  it("não inventa tabelas: só entra no plano o que está mapeado", () => {
    const plan = cleanupPlan([rec("clients", "c1")]);
    expect(plan).toEqual([{ table: "clients", ids: ["c1"] }]);
    expect(cleanupPlan([])).toEqual([]);
  });

  it("agrupa ids da mesma tabela sem repetir", () => {
    const plan = cleanupPlan([rec("clients", "c1"), rec("clients", "c2"), rec("clients", "c1")]);
    expect(plan).toEqual([{ table: "clients", ids: ["c1", "c2"] }]);
  });

  it("tabelas desconhecidas não são silenciosamente ignoradas", () => {
    const plan = cleanupPlan([rec("clients", "c1"), rec("tabela_nova", "x1")]);
    expect(plan.map((s) => s.table)).toEqual(["clients", "tabela_nova"]);
  });

  it("registro manual do tenant (Fernando) nunca entra no cleanup", () => {
    const mapped = [rec("clients", "ana-demo")];
    expect(isScenarioOwned(mapped, "clients", "fernando-manual")).toBe(false);
    const ids = cleanupPlan(mapped).flatMap((s) => s.ids);
    expect(ids).not.toContain("fernando-manual");
    expect(ids).toEqual(["ana-demo"]);
  });

  it("a ordem de remoção cobre as entidades do cenário sem duplicatas", () => {
    expect(new Set(CLEANUP_ORDER).size).toBe(CLEANUP_ORDER.length);
    expect(CLEANUP_ORDER).toContain("travel_files");
    expect(CLEANUP_ORDER).toContain("travelers");
  });
});

describe("mapeamento idempotente", () => {
  it("segunda execução do provisionamento não cria novos vínculos", () => {
    const desired = [rec("clients", "c1"), rec("opportunities", "op1")];
    expect(newMappings([], desired)).toHaveLength(2);
    expect(newMappings(desired, desired)).toEqual([]);
  });

  it("adiciona apenas o que falta e descarta duplicatas do lote", () => {
    const pending = newMappings([rec("clients", "c1")], [
      rec("clients", "c1"),
      rec("operations", "o1"),
      rec("operations", "o1"),
    ]);
    expect(pending).toEqual([{ table_name: "operations", record_id: "o1" }]);
  });

  it("ignora entradas inválidas", () => {
    expect(newMappings([], [{ table_name: "", record_id: "x" } as ScenarioRecord])).toEqual([]);
  });
});
