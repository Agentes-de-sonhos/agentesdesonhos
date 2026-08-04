/** Lógica pura da integração somente-leitura do Painel RSVP (testável). */

export const MAX_EMAILS = 500;

export type MatchStatus =
  | 'active_subscriber'
  | 'inactive_subscriber'
  | 'registered_no_subscription'
  | 'not_found';

export interface MatchRow {
  normalized_email: string;
  status: MatchStatus;
  plan: string | null;
}

export type ParseResult =
  | { ok: true; emails: string[] }
  | { ok: false; error: string };

/** Normaliza (trim + lowercase), remove vazios e duplicados preservando a ordem. */
export function normalizeEmails(input: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Valida o corpo da requisição: apenas { emails: string[] }, no máximo 500. */
export function parseBody(body: unknown): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Corpo inválido.' };
  }
  const emails = (body as Record<string, unknown>).emails;
  if (!Array.isArray(emails)) {
    return { ok: false, error: 'Campo "emails" deve ser uma lista.' };
  }
  if (emails.length > MAX_EMAILS) {
    return { ok: false, error: `Máximo de ${MAX_EMAILS} e-mails por requisição.` };
  }
  const normalized = normalizeEmails(emails);
  if (normalized.length === 0) {
    return { ok: false, error: 'Nenhum e-mail válido informado.' };
  }
  return { ok: true, emails: normalized };
}

/** Comparação de chave em tempo (aproximadamente) constante, sem vazar o valor. */
export function safeKeyCompare(provided: string | null, expected: string | null): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Garante que a resposta contenha apenas os e-mails solicitados e apenas os
 * campos permitidos (normalized_email, status, plan).
 */
export function buildResponse(requested: string[], rows: unknown): MatchRow[] {
  const byEmail = new Map<string, MatchRow>();
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const email = typeof r.normalized_email === 'string' ? r.normalized_email : '';
      if (!email) continue;
      const status = r.status as MatchStatus;
      byEmail.set(email, {
        normalized_email: email,
        status: status ?? 'not_found',
        plan: typeof r.plan === 'string' && r.plan ? r.plan : null,
      });
    }
  }
  return requested.map(
    (email) =>
      byEmail.get(email) ?? { normalized_email: email, status: 'not_found', plan: null },
  );
}