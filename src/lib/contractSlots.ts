import type {
  ContractDynamicSnapshot,
  ContractRenderConfig,
  ResolvedContractBlock,
  ResolvedSlotValue,
} from '@/types/contracts';

/**
 * Motor genérico de campos dinâmicos dentro de texto jurídico fixo.
 * Tokens aceitos no body_html das seções:
 *   {{slot:chave}}              valor textual (inline)
 *   {{list:chave}}              lista (parágrafo inteiro)
 *   {{table:chave}}             tabela (parágrafo inteiro)
 *   {{check:chave}}             caixa de ciência — "(X)" / "( )"
 *   {{choice:grupo=valor}}      opção exclusiva — "(X)" / "( )"
 *   {{signatures}}              bloco de assinaturas do modelo
 * O texto ao redor do token nunca é alterado. Nada é inferido: valor ausente = pendência.
 */

export interface SlotContext {
  /** Valores por fonte (ex.: "contractor.cpf" -> "123..."). */
  values: Record<string, string | null | undefined>;
  lists: Record<string, string[]>;
  tables: Record<string, Record<string, string>[]>;
  checks: Record<string, boolean | undefined>;
  choices: Record<string, string | null | undefined>;
  contractor_name: string;
  contracted_name: string;
}

const TOKEN = /\{\{(slot|check|choice):([a-z0-9_]+)(?:=([a-z0-9_]+))?\}\}/gi;
const WHOLE = /^\{\{(list|table):([a-z0-9_]+)\}\}$|^\{\{signatures\}\}$/i;

export const MARK_ON = '(X)';
export const MARK_OFF = '( )';

function decode(s: string) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

/** Extrai os parágrafos de um body_html simples (<p>…</p>). */
export function htmlParagraphs(html: string): string[] {
  const parts = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  const raw = parts ? parts.map((p) => p.replace(/<\/?p[^>]*>/gi, '')) : html.split(/\n+/);
  return raw.map((p) => decode(p.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim()).filter(Boolean);
}

/** Lista todos os tokens usados em um conjunto de parágrafos. */
export function listTokens(html: string): string[] {
  const out: string[] = [];
  for (const p of htmlParagraphs(html)) {
    const w = p.match(WHOLE);
    if (w) out.push(w[1] ? `${w[1]}:${w[2]}` : 'signatures');
    for (const m of p.matchAll(TOKEN)) out.push(m[3] ? `${m[1]}:${m[2]}=${m[3]}` : `${m[1]}:${m[2]}`);
  }
  return out;
}

export function isSlottedConfig(cfg?: ContractRenderConfig | null): boolean {
  return cfg?.mode === 'slotted';
}

export function resolveSlottedSections(
  sections: { title: string | null; body_html: string }[],
  cfg: ContractRenderConfig,
  ctx: SlotContext,
): { sections: { title: string | null; body_html: string; blocks: ResolvedContractBlock[] }[]; dynamic: ContractDynamicSnapshot } {
  const slots: Record<string, ResolvedSlotValue> = {};
  const missing = new Set<string>();

  for (const [key, def] of Object.entries(cfg.slots ?? {})) {
    const v = ctx.values[def.source];
    const value = v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim();
    slots[key] = { value, source: def.source, required: def.required };
    if (def.required && !value) missing.add(`slot:${key}`);
  }
  const lists: Record<string, string[]> = {};
  for (const [key, def] of Object.entries(cfg.lists ?? {})) {
    lists[key] = (ctx.lists[def.source] ?? []).filter((x) => x.trim());
    if (def.required && !lists[key].length) missing.add(`list:${key}`);
  }
  for (const [key, def] of Object.entries(cfg.tables ?? {})) {
    if (def.required && !(ctx.tables[def.source] ?? []).length) missing.add(`table:${key}`);
  }
  const checks: Record<string, boolean> = {};
  for (const [key, def] of Object.entries(cfg.checks ?? {})) {
    checks[key] = ctx.checks[key] === true; // nunca marca sozinho
    if (def.required && !checks[key]) missing.add(`check:${key}`);
  }
  const choices: Record<string, string | null> = {};
  for (const [key, def] of Object.entries(cfg.choices ?? {})) {
    const v = ctx.choices[key];
    choices[key] = v && def.options[v] ? v : null;
    if (def.required && !choices[key]) missing.add(`choice:${key}`);
  }

  const resolveInline = (p: string) =>
    p.replace(TOKEN, (_m, kind: string, key: string, opt?: string) => {
      const k = kind.toLowerCase();
      if (k === 'slot') return slots[key]?.value ?? cfg.slots?.[key]?.fallback ?? '______';
      if (k === 'check') return checks[key] ? MARK_ON : MARK_OFF;
      return choices[key] && choices[key] === opt ? MARK_ON : MARK_OFF;
    });

  const out = sections.map((s) => {
    const blocks: ResolvedContractBlock[] = [];
    for (const p of htmlParagraphs(s.body_html)) {
      const w = p.match(WHOLE);
      if (w && !w[1] && cfg.signatures) {
        blocks.push({ kind: 'signatures', def: cfg.signatures, contractor_name: ctx.contractor_name, contracted_name: ctx.contracted_name });
      } else if (w && w[1]?.toLowerCase() === 'list') {
        blocks.push({ kind: 'list', items: lists[w[2]] ?? [] });
      } else if (w && w[1]?.toLowerCase() === 'table') {
        const def = cfg.tables?.[w[2]];
        const rows = (ctx.tables[def?.source ?? w[2]] ?? []).map((r) => (def?.columns ?? []).map((c) => r[c] || '—'));
        blocks.push({ kind: 'table', header: def?.header ?? [], rows });
      } else {
        blocks.push({ kind: 'text', text: resolveInline(p) });
      }
    }
    return { ...s, blocks };
  });

  return { sections: out, dynamic: { slots, lists, checks, choices, missing: [...missing] } };
}

/** Texto plano final (para testes e auditoria). */
export function resolvedSectionsText(sections: { title: string | null; blocks?: ResolvedContractBlock[] }[]): string {
  const lines: string[] = [];
  for (const s of sections) {
    if (s.title) lines.push(s.title);
    for (const b of s.blocks ?? []) {
      if (b.kind === 'text') lines.push(b.text);
      else if (b.kind === 'list') b.items.forEach((i) => lines.push(`• ${i}`));
      else if (b.kind === 'table') {
        lines.push(b.header.join(' | '));
        b.rows.forEach((r) => lines.push(r.join(' | ')));
      } else {
        lines.push(b.def.contracted_label, `${b.def.contractor_label} ${b.contractor_name}`, b.def.witnesses_label);
      }
    }
  }
  return lines.join('\n');
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function emissionParts(iso: string) {
  const d = new Date(iso);
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()], year: String(d.getFullYear()) };
}

export const formatNumberBR = (v: number) =>
  (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SLOT_MISSING_LABEL = (cfg: ContractRenderConfig, token: string): string => {
  const [kind, key] = token.split(':');
  const map = { slot: cfg.slots, list: cfg.lists, table: cfg.tables, check: cfg.checks, choice: cfg.choices } as Record<string, Record<string, { label: string }> | undefined>;
  return map[kind]?.[key]?.label ?? key;
};
