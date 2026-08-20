import { describe, it, expect } from 'vitest';
import {
  FX_ALLOWED_CURRENCIES,
  convertWithRate,
  fxRateUrl,
  isFxCurrency,
  isValidRate,
  parseAmount,
} from '@/lib/fxConversion';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fx-rate`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const call = (qs: string) => fetch(`${FN_URL}${qs}`, { headers: { apikey: KEY } });

describe('allowlist e validação', () => {
  it('cobre exatamente as moedas do conversor, incluindo ARS e CLP', () => {
    expect([...FX_ALLOWED_CURRENCIES].sort()).toEqual(
      ['ARS', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'EUR', 'GBP', 'JPY', 'MXN', 'USD'].sort(),
    );
    expect(isFxCurrency('ARS')).toBe(true);
    expect(isFxCurrency('CLP')).toBe(true);
    expect(isFxCurrency('ars')).toBe(false);
    expect(isFxCurrency('XYZ')).toBe(false);
  });

  it('rejeita taxas inválidas, zero ou negativas', () => {
    expect(isValidRate(0)).toBe(false);
    expect(isValidRate(-1)).toBe(false);
    expect(isValidRate(null)).toBe(false);
    expect(isValidRate(NaN)).toBe(false);
    expect(isValidRate(Infinity)).toBe(false);
    expect(isValidRate('5.2')).toBe(false);
    expect(isValidRate(5.2)).toBe(true);
  });

  it('não converte com taxa inválida', () => {
    expect(convertWithRate(100, 0, 'TO_BRL')).toBe(0);
    expect(convertWithRate(NaN, 5, 'TO_BRL')).toBe(0);
  });
});

describe('lógica de conversão nos dois sentidos', () => {
  it('TO_BRL multiplica e BRL_TO divide', () => {
    expect(convertWithRate(100, 5.2, 'TO_BRL')).toBeCloseTo(520, 6);
    expect(convertWithRate(520, 5.2, 'BRL_TO')).toBeCloseTo(100, 6);
  });

  it('aceita vírgula decimal na entrada', () => {
    expect(parseAmount('100,50')).toBeCloseTo(100.5, 6);
    expect(parseAmount('abc')).toBe(0);
  });

  it('monta a URL da função com os parâmetros', () => {
    expect(fxRateUrl('ARS', 'BRL')).toContain('/functions/v1/fx-rate?from=ARS&to=BRL');
  });
});

describe('Edge Function fx-rate (integração)', () => {
  it('rejeita parâmetros ausentes ou fora da allowlist com 400', async () => {
    for (const qs of ['', '?from=ARS', '?from=XYZ&to=BRL', '?from=ars&to=BRL']) {
      const res = await call(qs);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Moeda inválida.');
    }
  }, 30000);

  it.each(['ARS', 'CLP', 'USD', 'EUR'])('retorna taxa válida para %s→BRL', async (from) => {
    const res = await call(`?from=${from}&to=BRL`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.from).toBe(from);
    expect(body.to).toBe('BRL');
    expect(isValidRate(body.rate)).toBe(true);
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof body.provider).toBe('string');
  }, 30000);

  it('BRL→ARS também responde (sentido inverso no provedor)', async () => {
    const res = await call('?from=BRL&to=ARS');
    expect(res.status).toBe(200);
    expect(isValidRate((await res.json()).rate)).toBe(true);
  }, 30000);

  it('mesma moeda retorna taxa 1', async () => {
    const res = await call('?from=BRL&to=BRL');
    const body = await res.json();
    expect(body.rate).toBe(1);
  }, 30000);
});
