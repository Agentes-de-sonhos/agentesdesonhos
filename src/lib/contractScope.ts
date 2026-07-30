/**
 * Sugestão assistida por IA para "Serviços inclusos" e "Serviços não inclusos"
 * do contrato da venda.
 *
 * Regras invioláveis:
 * - A IA nunca escreve direto no textarea. Tudo passa por revisão da agência.
 * - Só entram na IA dados de escopo da própria venda (e de orçamento/carteira
 *   vinculados por ID). Nunca custo, comissão, margem ou nota interna.
 */

export type ScopeField = 'included' | 'not_included';

export type ScopeSourceType = 'sale' | 'quote' | 'wallet' | 'general_suggestion';

export const SCOPE_SOURCE_LABEL: Record<ScopeSourceType, string> = {
  sale: 'Venda',
  quote: 'Orçamento vinculado',
  wallet: 'Carteira vinculada',
  general_suggestion: 'Sugestão para conferir',
};

export interface ScopeItem {
  text: string;
  confidence: 'sourced' | 'suggested';
  source_type: ScopeSourceType;
  source_ids: string[];
  rationale?: string;
}

/** Proveniência interna (auditoria). Nunca aparece no PDF do cliente. */
export interface ScopeProvenanceEntry {
  field: ScopeField;
  text: string;
  source_type: ScopeSourceType;
  source_ids: string[];
  confidence: 'sourced' | 'suggested';
  applied_at: string;
  applied_by: string | null;
  /** Marcado quando a agência editou a linha sugerida antes de aplicar. */
  edited?: boolean;
}

/** Serviço já sanitizado, pronto para ir ao prompt. */
export interface ScopeSourceService {
  id: string;
  origin: Exclude<ScopeSourceType, 'general_suggestion'>;
  origin_label: string;
  type: string;
  description?: string;
  supplier?: string;
  operator?: string;
  /** Campos estruturados adicionais (regime, bagagem, trechos, datas...). */
  details: Record<string, string>;
}

/** Chaves que NUNCA podem ser enviadas à IA. */
const BLOCKED_KEY =
  /(price|cost|custo|valor|amount|total|comiss|markup|margem|lucro|net_|fee|taxa|tax\b|payment|pagamento|internal|interna|confiden|cpf|passport|passaporte|document|rg\b|email|phone|telefone|whatsapp)/i;

/** Chaves que descrevem escopo e são úteis para o contrato. */
const MAX_DETAIL_LEN = 240;

function normalizePrimitive(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim();
    return t ? t.slice(0, MAX_DETAIL_LEN) : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  return undefined;
}

/**
 * Extrai apenas campos de escopo (texto curto) de um `service_data`,
 * removendo qualquer chave sensível ou financeira.
 */
export function sanitizeServiceData(data: unknown, depth = 0): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data || typeof data !== 'object' || Array.isArray(data) || depth > 1) return out;
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (BLOCKED_KEY.test(key)) continue;
    const primitive = normalizePrimitive(value);
    if (primitive) {
      out[key] = primitive;
      continue;
    }
    if (Array.isArray(value)) {
      const parts = value
        .map((v) =>
          typeof v === 'object' && v
            ? Object.entries(sanitizeServiceData(v, depth + 1))
                .map(([k, val]) => `${k}: ${val}`)
                .join(', ')
            : normalizePrimitive(v),
        )
        .filter((v): v is string => !!v);
      if (parts.length) out[key] = parts.join(' | ').slice(0, MAX_DETAIL_LEN * 2);
      continue;
    }
    if (value && typeof value === 'object' && depth === 0) {
      const nested = sanitizeServiceData(value, depth + 1);
      const joined = Object.entries(nested)
        .map(([k, val]) => `${k}: ${val}`)
        .join(', ');
      if (joined) out[key] = joined.slice(0, MAX_DETAIL_LEN * 2);
    }
  }
  return out;
}

const TEXT_MAX = 220;
const MAX_ITEMS = 30;

/** Valida a resposta JSON da IA. Itens fora do schema são descartados. */
export function parseScopeItems(raw: unknown, allowedIds: string[]): ScopeItem[] {
  const list = (raw as { items?: unknown })?.items;
  if (!Array.isArray(list)) return [];
  const allowed = new Set(allowedIds);
  const seen = new Set<string>();
  const out: ScopeItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const text = typeof e.text === 'string' ? e.text.replace(/^[-•*\s]+/, '').trim() : '';
    if (!text) continue;
    const key = text.toLocaleLowerCase();
    if (seen.has(key)) continue;
    const source_type: ScopeSourceType =
      e.source_type === 'quote' || e.source_type === 'wallet' || e.source_type === 'general_suggestion'
        ? e.source_type
        : 'sale';
    const confidence =
      source_type === 'general_suggestion' || e.confidence === 'suggested' ? 'suggested' : 'sourced';
    const source_ids = Array.isArray(e.source_ids)
      ? (e.source_ids.filter((id) => typeof id === 'string' && allowed.has(id)) as string[])
      : [];
    seen.add(key);
    out.push({
      text: text.slice(0, TEXT_MAX),
      confidence,
      source_type: confidence === 'suggested' && source_type !== 'general_suggestion'
        ? 'general_suggestion'
        : source_type,
      source_ids,
      rationale: typeof e.rationale === 'string' ? e.rationale.slice(0, 200) : undefined,
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function splitCurrentLines(current: string): string[] {
  return current
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Mescla os itens confirmados com o conteúdo atual do textarea.
 * Deduplicação case-insensitive. Nunca perde conteúdo no modo "append".
 */
export function mergeScopeLines(
  current: string,
  lines: string[],
  mode: 'replace' | 'append',
): { text: string; applied: number } {
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  const base = mode === 'replace' ? [] : splitCurrentLines(current);
  const seen = new Set(base.map((l) => l.toLocaleLowerCase()));
  let applied = 0;
  for (const line of clean) {
    const key = line.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    base.push(line);
    applied += 1;
  }
  return { text: base.join('\n'), applied };
}