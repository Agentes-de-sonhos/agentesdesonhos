/**
 * Importação assistida do seguro viagem no contrato da venda.
 *
 * Regras invioláveis:
 * - NÃO é IA. Nada é inferido, resumido ou inventado.
 * - Apenas campos estruturados já cadastrados pela agência são reaproveitados.
 * - Nada é aplicado sem confirmação explícita da agência.
 */

export type InsuranceSourceKind = 'venda' | 'carteira' | 'orcamento' | 'periodo_viagem';

export const SOURCE_LABEL: Record<InsuranceSourceKind, string> = {
  venda: 'Venda',
  carteira: 'Carteira digital',
  orcamento: 'Orçamento',
  periodo_viagem: 'Período da viagem',
};

/** Ordem de precedência para sugerir a melhor fonte (a agência pode trocar). */
export const SOURCE_PRIORITY: InsuranceSourceKind[] = [
  'venda',
  'carteira',
  'orcamento',
  'periodo_viagem',
];

export type InsuranceField = 'insurer' | 'plan' | 'validity' | 'coverage';

export const FIELD_LABEL: Record<InsuranceField, string> = {
  insurer: 'Seguradora',
  plan: 'Plano',
  validity: 'Vigência',
  coverage: 'Coberturas',
};

export interface InsuranceCandidate {
  /** Identificador estável da opção (fonte + registro). */
  key: string;
  kind: InsuranceSourceKind;
  /** Nome/número do registro de origem. */
  recordLabel: string;
  /** ID do registro de origem (auditoria). */
  recordId: string;
  updatedAt?: string | null;
  insurer?: string;
  plan?: string;
  validity?: string;
  coverage?: string;
  /** Descrição livre do item — nunca vira cobertura sem confirmação manual. */
  description?: string;
  /** Vigência apenas sugerida a partir do período da viagem. */
  validityIsTripFallback?: boolean;
}

const clean = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

function parseLocal(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function fmt(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Formata "dd/mm/aaaa a dd/mm/aaaa". Retorna undefined quando incompleta
 * ou quando início > fim (nunca "conserta" datas silenciosamente).
 */
export function formatValidityRange(
  start?: string | null,
  end?: string | null,
): string | undefined {
  const a = parseLocal(start);
  const b = parseLocal(end);
  if (!a || !b) return undefined;
  if (a.getTime() > b.getTime()) return undefined;
  return `${fmt(a)} a ${fmt(b)}`;
}

type Json = Record<string, unknown>;

export interface SaleInsuranceProductRow {
  id: string;
  product_type: string;
  description: string | null;
  supplier_name: string | null;
  operator_id?: string | null;
  updated_at?: string | null;
}

export interface TripInsuranceRow {
  id: string;
  service_type: string;
  service_data: Json | null;
  updated_at?: string | null;
  trip_id: string;
  trip_label?: string | null;
}

export interface QuoteInsuranceRow {
  id: string;
  service_type: string;
  service_data: Json | null;
  description?: string | null;
  option_label?: string | null;
  updated_at?: string | null;
  quote_id: string;
  quote_label?: string | null;
}

/**
 * Venda: apenas campos estruturados. `supplier_name` é a seguradora do item de
 * seguro — a operadora da viagem NUNCA é usada como seguradora.
 * Plano, vigência e coberturas não existem estruturados na venda.
 */
export function candidatesFromSaleProducts(
  products: SaleInsuranceProductRow[],
): InsuranceCandidate[] {
  return products
    .filter((p) => p.product_type === 'seguro')
    .map((p, i) => ({
      key: `venda:${p.id}`,
      kind: 'venda' as const,
      recordId: p.id,
      recordLabel: `Serviço de seguro da venda${products.length > 1 ? ` #${i + 1}` : ''}`,
      updatedAt: p.updated_at ?? null,
      insurer: clean(p.supplier_name),
      description: clean(p.description),
    }))
    .filter((c) => !!c.insurer || !!c.description);
}

export function candidatesFromTripServices(rows: TripInsuranceRow[]): InsuranceCandidate[] {
  return rows
    .filter((r) => r.service_type === 'insurance')
    .map((r) => {
      const d = (r.service_data ?? {}) as Json;
      return {
        key: `carteira:${r.id}`,
        kind: 'carteira' as const,
        recordId: r.id,
        recordLabel: clean(r.trip_label) ?? 'Carteira digital vinculada',
        updatedAt: r.updated_at ?? null,
        insurer: clean(d.provider),
        plan: clean(d.plan_name),
        validity: formatValidityRange(clean(d.start_date), clean(d.end_date)),
        coverage: clean(d.coverage) ?? clean(d.coverage_type),
        description: clean(d.notes),
      };
    })
    .filter((c) => c.insurer || c.plan || c.validity || c.coverage);
}

export function candidatesFromQuoteServices(rows: QuoteInsuranceRow[]): InsuranceCandidate[] {
  return rows
    .filter((r) => r.service_type === 'insurance')
    .map((r) => {
      const d = (r.service_data ?? {}) as Json;
      return {
        key: `orcamento:${r.id}`,
        kind: 'orcamento' as const,
        recordId: r.id,
        recordLabel: clean(r.quote_label) ?? 'Orçamento vinculado',
        updatedAt: r.updated_at ?? null,
        insurer: clean(d.provider),
        plan: clean(d.plan_name) ?? clean(r.option_label),
        validity: formatValidityRange(clean(d.start_date), clean(d.end_date)),
        coverage: clean(d.coverage),
        description: clean(d.notes) ?? clean(r.description),
      };
    })
    .filter((c) => c.insurer || c.plan || c.validity || c.coverage);
}

/** Fallback exclusivo de vigência: período oficial da viagem registrado na venda. */
export function candidateFromTripPeriod(
  saleId: string,
  startDate?: string | null,
  endDate?: string | null,
): InsuranceCandidate | null {
  const validity = formatValidityRange(startDate, endDate);
  if (!validity) return null;
  return {
    key: `periodo_viagem:${saleId}`,
    kind: 'periodo_viagem',
    recordId: saleId,
    recordLabel: 'Período oficial da viagem (venda)',
    validity,
    validityIsTripFallback: true,
  };
}

export function sortCandidates(list: InsuranceCandidate[]): InsuranceCandidate[] {
  return [...list].sort(
    (a, b) => SOURCE_PRIORITY.indexOf(a.kind) - SOURCE_PRIORITY.indexOf(b.kind),
  );
}

/**
 * Melhor candidato por campo, seguindo a precedência.
 * A vigência só cai no período da viagem quando nenhuma fonte tem vigência própria.
 */
export function bestCandidateFor(
  field: InsuranceField,
  candidates: InsuranceCandidate[],
): InsuranceCandidate | null {
  const ordered = sortCandidates(candidates);
  const own = ordered.find((c) => !!c[field] && !c.validityIsTripFallback);
  if (own) return own;
  return ordered.find((c) => !!c[field]) ?? null;
}

export function candidatesWithField(
  field: InsuranceField,
  candidates: InsuranceCandidate[],
): InsuranceCandidate[] {
  return sortCandidates(candidates).filter((c) => !!c[field]);
}

/** Proveniência auditável gravada no snapshot da nova revisão (não aparece no PDF). */
export interface InsuranceFieldProvenance {
  field: InsuranceField;
  source_kind: InsuranceSourceKind;
  source_record_id: string;
  source_record_label: string;
  imported_at: string;
  imported_by: string | null;
  value: string;
}