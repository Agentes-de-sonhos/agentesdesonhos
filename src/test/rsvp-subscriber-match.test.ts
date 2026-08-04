import { describe, it, expect } from 'vitest';
import {
  MAX_EMAILS,
  normalizeEmails,
  parseBody,
  safeKeyCompare,
  buildResponse,
} from '../../supabase/functions/rsvp-subscriber-match/logic';

describe('rsvp-subscriber-match: autenticação por chave', () => {
  it('rejeita chave ausente', () => {
    expect(safeKeyCompare(null, 'abc')).toBe(false);
    expect(safeKeyCompare('', 'abc')).toBe(false);
  });
  it('rejeita chave inválida', () => {
    expect(safeKeyCompare('abd', 'abc')).toBe(false);
    expect(safeKeyCompare('abcd', 'abc')).toBe(false);
  });
  it('aceita chave correta', () => {
    expect(safeKeyCompare('abc', 'abc')).toBe(true);
  });
  it('rejeita quando o segredo não está configurado', () => {
    expect(safeKeyCompare('abc', null)).toBe(false);
  });
});

describe('rsvp-subscriber-match: payload', () => {
  it('rejeita corpo não-objeto ou sem lista', () => {
    expect(parseBody(null).ok).toBe(false);
    expect(parseBody([]).ok).toBe(false);
    expect(parseBody({ emails: 'a@b.com' }).ok).toBe(false);
    expect(parseBody({}).ok).toBe(false);
  });
  it('rejeita lote acima do limite', () => {
    const emails = Array.from({ length: MAX_EMAILS + 1 }, (_, i) => `u${i}@example.test`);
    const res = parseBody({ emails });
    expect(res.ok).toBe(false);
  });
  it('aceita lote no limite', () => {
    const emails = Array.from({ length: MAX_EMAILS }, (_, i) => `u${i}@example.test`);
    const res = parseBody({ emails });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.emails).toHaveLength(MAX_EMAILS);
  });
  it('ignora parâmetros extras', () => {
    const res = parseBody({ emails: ['A@Example.Test'], user_id: 'x', select: '*' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.emails).toEqual(['a@example.test']);
  });
});

describe('rsvp-subscriber-match: normalização', () => {
  it('faz trim, lowercase, remove vazios e duplicados', () => {
    expect(
      normalizeEmails(['  A@Example.Test ', 'a@example.test', '', '   ', 'B@Example.Test', 42]),
    ).toEqual(['a@example.test', 'b@example.test']);
  });
});

describe('rsvp-subscriber-match: classificação', () => {
  const requested = ['a@example.test', 'b@example.test', 'c@example.test', 'd@example.test'];
  const rows = [
    { normalized_email: 'a@example.test', status: 'active_subscriber', plan: 'premium' },
    { normalized_email: 'b@example.test', status: 'inactive_subscriber', plan: 'start' },
    { normalized_email: 'c@example.test', status: 'registered_no_subscription', plan: null },
    { normalized_email: 'x@example.test', status: 'active_subscriber', plan: 'premium' },
  ];

  it('retorna apenas os e-mails solicitados, com not_found como padrão', () => {
    const out = buildResponse(requested, rows);
    expect(out.map((r) => r.normalized_email)).toEqual(requested);
    expect(out.map((r) => r.status)).toEqual([
      'active_subscriber',
      'inactive_subscriber',
      'registered_no_subscription',
      'not_found',
    ]);
    expect(out[3].plan).toBeNull();
  });

  it('expõe somente os campos permitidos', () => {
    const out = buildResponse(['a@example.test'], [
      {
        normalized_email: 'a@example.test',
        status: 'active_subscriber',
        plan: 'premium',
        user_id: 'uuid',
        stripe_customer_id: 'cus_1',
        full_name: 'Nome',
      },
    ]);
    expect(Object.keys(out[0]).sort()).toEqual(['normalized_email', 'plan', 'status'].sort());
  });
});