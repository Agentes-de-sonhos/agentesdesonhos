import { describe, it, expect } from "vitest";
import {
  buildServiceCatalog, calcCommission, commissionSnapshot, findDuplicateService, finalizeProductCommission,
  kindFromStored, resolveCommissionSuggestion, validateRule, validateSaleCommission,
} from "@/lib/supplierCommissionRules";

const OP = "op-1";
const rules = [
  { operator_id: OP, service_key: "sys:hotel", commission_type: "percentage" as const, commission_value: 12 },
  { operator_id: OP, service_key: "sys:seguro", commission_type: "none" as const, commission_value: null },
  { operator_id: OP, service_key: "sys:transfer", commission_type: "fixed" as const, commission_value: null },
];
const legacy = { default_commission_type: "percentage" as const, default_commission_percent: 8, default_commission_fixed: null };

describe("prioridade das regras", () => {
  it("regra específica fornecedor+serviço vence a comissão geral antiga", () => {
    expect(resolveCommissionSuggestion({ operatorId: OP, serviceKey: "sys:hotel", rules, legacy }))
      .toEqual({ status: "specific", kind: "percentage", value: 12 });
  });
  it("usa a comissão antiga só como fallback identificado", () => {
    expect(resolveCommissionSuggestion({ operatorId: OP, serviceKey: "sys:aereo", rules, legacy }))
      .toEqual({ status: "legacy_fallback", kind: "percentage", value: 8 });
  });
  it("sem regra nem fallback não assume zero", () => {
    expect(resolveCommissionSuggestion({ operatorId: OP, serviceKey: "sys:aereo", rules, legacy: null })).toEqual({ status: "no_rule" });
  });
  it("'sem comissão' é diferente de 'sem regra'", () => {
    expect(resolveCommissionSuggestion({ operatorId: OP, serviceKey: "sys:seguro", rules, legacy })).toMatchObject({ status: "specific", kind: "none" });
  });
  it("regra de outro fornecedor não se aplica", () => {
    expect(resolveCommissionSuggestion({ operatorId: "op-2", serviceKey: "sys:hotel", rules, legacy: null }).status).toBe("no_rule");
  });
  it("sem fornecedor ou serviço ainda não sugere nada", () => {
    expect(resolveCommissionSuggestion({ operatorId: null, serviceKey: "sys:hotel", rules }).status).toBe("incomplete");
  });
});

describe("cálculo", () => {
  it("percentual sobre preço menos taxas da operação", () => {
    expect(calcCommission("percentage", 10, 1000, 150)).toEqual({ base: 850, amount: 85 });
  });
  it("valor fixo não depende da base", () => {
    expect(calcCommission("fixed", 594.72, 1000, 900).amount).toBe(594.72);
  });
  it("sem comissão = 0", () => {
    expect(calcCommission("none", null, 1000, 0).amount).toBe(0);
  });
  it("base nunca fica negativa", () => {
    expect(calcCommission("percentage", 10, 100, 300).base).toBe(0);
  });
});

describe("validações", () => {
  it("sem regra exige definição antes de concluir", () => {
    expect(validateSaleCommission(null, 0, 1000, 0)).not.toBeNull();
  });
  it("valor fixo sem montante exige informar na venda", () => {
    expect(validateSaleCommission("fixed", null as any, 1000, 0)).toMatch(/valor fixo/i);
  });
  it("percentual acima de 100 é inválido", () => {
    expect(validateSaleCommission("percentage", 101, 1000, 0)).not.toBeNull();
    expect(validateRule("percentage", 101)).not.toBeNull();
  });
  it("regra de valor fixo pode ficar sem valor no fornecedor", () => {
    expect(validateRule("fixed", null)).toBeNull();
  });
  it("taxas maiores que o preço são inválidas", () => {
    expect(validateSaleCommission("percentage", 10, 100, 200)).not.toBeNull();
  });
});

describe("snapshot e histórico", () => {
  it("grava tipo, valor e valor efetivo; 'sem comissão' compatível como fixo 0", () => {
    expect(commissionSnapshot("percentage", 10, 1000, 100, "specific")).toEqual({
      commission_kind: "percentage", commission_type: "percentage", commission_value: 10,
      commission_rule_source: "specific", commission_amount_snapshot: 90,
    });
    expect(commissionSnapshot("none", null, 1000, 0, "specific")).toMatchObject({ commission_type: "fixed", commission_value: 0, commission_amount_snapshot: 0 });
  });
  it("finalizar recusa produto sem comissão definida", () => {
    expect(() => finalizeProductCommission({ commission_kind: null, commission_value: 0, sale_price: 100, non_commissionable_taxes: 0 })).toThrow();
  });
  it("produto antigo abre com o tipo gravado, sem reaplicar regra", () => {
    expect(kindFromStored({ commission_type: "fixed" })).toBe("fixed");
    expect(kindFromStored({ commission_kind: "none", commission_type: "fixed" })).toBe("none");
  });
});

describe("catálogo de serviços", () => {
  const catalog = buildServiceCatalog([{ id: "11111111-1111-1111-1111-111111111111", name: "Hospedagem internacional", base_category: "hotel" }]);
  it("inclui categorias do sistema e serviços da agência", () => {
    expect(catalog.find((s) => s.key === "sys:trem")).toBeTruthy();
    expect(catalog.find((s) => s.key === "custom:11111111-1111-1111-1111-111111111111")?.baseCategory).toBe("hotel");
  });
  it("evita duplicata ignorando acentos e caixa", () => {
    expect(findDuplicateService("hospedagem INTERNACIONAL", catalog)?.custom).toBe(true);
    expect(findDuplicateService("Aereo", catalog)?.key).toBe("sys:aereo");
    expect(findDuplicateService("Chip de dados", catalog)).toBeNull();
  });
  it("serviços de outra agência não entram no catálogo (só linhas da própria agência são passadas)", () => {
    expect(buildServiceCatalog([]).some((s) => s.custom)).toBe(false);
  });
});
