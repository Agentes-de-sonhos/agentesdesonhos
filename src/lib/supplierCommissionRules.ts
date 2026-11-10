import type { ProductType } from "@/types/financial";

/** Tipo de comissão de uma regra / snapshot. "none" = sem comissão (explicitamente). */
export type CommissionKind = "percentage" | "fixed" | "none";
export type RuleSource = "specific" | "legacy_fallback" | "manual";

export interface ServiceOption {
  key: string; // "sys:<id>" | "custom:<uuid>"
  label: string;
  baseCategory: ProductType;
  custom: boolean;
}

/** Categorias do sistema (compartilhadas por todas as agências, mapeadas para product_type). */
export const SYSTEM_SERVICES: ServiceOption[] = [
  { key: "sys:hotel", label: "Hospedagem", baseCategory: "hotel", custom: false },
  { key: "sys:aereo", label: "Aéreo", baseCategory: "aereo", custom: false },
  { key: "sys:transfer", label: "Traslado / Transfer", baseCategory: "transfer", custom: false },
  { key: "sys:seguro", label: "Seguro viagem", baseCategory: "seguro", custom: false },
  { key: "sys:atracao", label: "Ingressos / Atrações", baseCategory: "atracao", custom: false },
  { key: "sys:locacao", label: "Locação de veículos", baseCategory: "locacao", custom: false },
  { key: "sys:trem", label: "Trem", baseCategory: "outro", custom: false },
  { key: "sys:cruzeiro", label: "Cruzeiro", baseCategory: "cruzeiro", custom: false },
  { key: "sys:pacote", label: "Pacote", baseCategory: "pacote", custom: false },
  { key: "sys:outro", label: "Outros", baseCategory: "outro", custom: false },
];

export const BASE_CATEGORY_LABELS: Record<ProductType, string> = {
  hotel: "Hospedagem", aereo: "Aéreo", transfer: "Traslado / Transfer", seguro: "Seguro viagem",
  atracao: "Ingressos / Atrações", locacao: "Locação de veículos", cruzeiro: "Cruzeiro",
  pacote: "Pacote", outro: "Outros",
};

export interface CustomServiceRow { id: string; name: string; base_category: string; is_active?: boolean }

export function normalizeServiceName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildServiceCatalog(custom: CustomServiceRow[]): ServiceOption[] {
  return [
    ...SYSTEM_SERVICES,
    ...custom.filter((c) => c.is_active !== false).map((c) => ({
      key: `custom:${c.id}`, label: c.name, baseCategory: c.base_category as ProductType, custom: true,
    })),
  ];
}

/** Retorna o serviço já existente (sistema ou personalizado) com o mesmo nome normalizado. */
export function findDuplicateService(name: string, catalog: ServiceOption[]): ServiceOption | null {
  const n = normalizeServiceName(name);
  if (!n) return null;
  return catalog.find((s) => normalizeServiceName(s.label) === n) ?? null;
}

/** Chave de serviço padrão para produtos antigos (sem service_key) a partir do product_type. */
export function legacyServiceKey(productType: string | null | undefined): string {
  return SYSTEM_SERVICES.some((s) => s.key === `sys:${productType}`) ? `sys:${productType}` : "sys:outro";
}

export interface SupplierServiceRule { operator_id: string; service_key: string; commission_type: CommissionKind; commission_value: number | null }
export interface LegacyTerms { default_commission_type: "percentage" | "fixed" | null; default_commission_percent: number | null; default_commission_fixed: number | null }

export type Suggestion =
  | { status: "specific" | "legacy_fallback"; kind: CommissionKind; value: number | null }
  | { status: "no_rule" }
  | { status: "incomplete" }; // falta fornecedor ou serviço

/** Prioridade: regra fornecedor+serviço > comissão geral antiga (fallback identificado) > sem regra. */
export function resolveCommissionSuggestion(args: {
  operatorId?: string | null; serviceKey?: string | null;
  rules: SupplierServiceRule[]; legacy?: LegacyTerms | null;
}): Suggestion {
  const { operatorId, serviceKey, rules, legacy } = args;
  if (!operatorId || !serviceKey) return { status: "incomplete" };
  const rule = rules.find((r) => r.operator_id === operatorId && r.service_key === serviceKey);
  if (rule) return { status: "specific", kind: rule.commission_type, value: rule.commission_value == null ? null : Number(rule.commission_value) };
  if (legacy?.default_commission_type === "percentage" && legacy.default_commission_percent != null)
    return { status: "legacy_fallback", kind: "percentage", value: Number(legacy.default_commission_percent) };
  if (legacy?.default_commission_type === "fixed" && legacy.default_commission_fixed != null)
    return { status: "legacy_fallback", kind: "fixed", value: Number(legacy.default_commission_fixed) };
  return { status: "no_rule" };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Preço de venda já inclui as taxas (semântica atual): base = preço − taxas da operação.
 * Valor fixo independe da base. Sem comissão = 0.
 */
export function calcCommission(kind: CommissionKind | null | undefined, value: number | null | undefined, salePrice: number, taxes: number) {
  const base = round2(Math.max(0, (Number(salePrice) || 0) - (Number(taxes) || 0)));
  if (kind === "percentage") return { base, amount: round2(base * (Number(value) || 0) / 100) };
  if (kind === "fixed") return { base, amount: round2(Number(value) || 0) };
  return { base, amount: 0 };
}

/** Validação de uma regra no cadastro do fornecedor (valor fixo pode ficar vazio = definir na venda). */
export function validateRule(kind: CommissionKind, value: number | null): string | null {
  if (kind === "none") return null;
  if (value == null) return kind === "percentage" ? "Informe o percentual." : null;
  if (!Number.isFinite(value) || value < 0) return "Valor inválido.";
  if (kind === "percentage" && value > 100) return "Percentual deve ser entre 0 e 100.";
  return null;
}

/** Validação da comissão no produto da venda (tudo precisa estar definido explicitamente). */
export function validateSaleCommission(kind: CommissionKind | null | undefined, value: number | null | undefined, salePrice: number, taxes: number): string | null {
  if (!kind) return "Defina a comissão deste serviço (não há regra cadastrada para este fornecedor e serviço).";
  if (!Number.isFinite(Number(taxes)) || Number(taxes) < 0) return "Taxas não comissionáveis inválidas.";
  if (Number(taxes) > Number(salePrice)) return "As taxas não podem ser maiores que o preço de venda.";
  if (kind === "none") return null;
  if (value == null || (value as any) === "" || !Number.isFinite(Number(value))) return kind === "fixed" ? "Informe o valor fixo da comissão nesta venda." : "Informe o percentual da comissão.";
  if (Number(value) < 0) return "A comissão não pode ser negativa.";
  if (kind === "percentage" && Number(value) > 100) return "Percentual deve ser entre 0 e 100.";
  return null;
}

/** Campos gravados no produto (snapshot). "none" é persistido como fixo 0 para manter compatibilidade. */
export function commissionSnapshot(kind: CommissionKind, value: number | null, salePrice: number, taxes: number, source: RuleSource) {
  const { amount } = calcCommission(kind, value, salePrice, taxes);
  return {
    commission_kind: kind,
    commission_type: (kind === "percentage" ? "percentage" : "fixed") as "percentage" | "fixed",
    commission_value: kind === "none" ? 0 : Number(value) || 0,
    commission_rule_source: source,
    commission_amount_snapshot: amount,
  };
}
