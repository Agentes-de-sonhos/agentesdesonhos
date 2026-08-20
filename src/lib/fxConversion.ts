/**
 * Lógica compartilhada do conversor de moedas da Carteira Digital pública.
 * A taxa sempre representa "1 unidade da moeda de origem = X unidades do destino".
 */

/** Moedas oferecidas no conversor. Allowlist única entre frontend e Edge Function. */
export const FX_ALLOWED_CURRENCIES = [
  'BRL',
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'MXN',
  'ARS',
  'CLP',
] as const;

export type FxCurrency = (typeof FX_ALLOWED_CURRENCIES)[number];

export function isFxCurrency(code: unknown): code is FxCurrency {
  return typeof code === 'string' && (FX_ALLOWED_CURRENCIES as readonly string[]).includes(code);
}

/** Uma taxa só é utilizável quando é numérica, finita e maior que zero. */
export function isValidRate(rate: unknown): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

export type FxDirection = 'BRL_TO' | 'TO_BRL';

/**
 * Converte usando a taxa "1 moeda de destino = rate BRL".
 * - `BRL_TO`: valor em reais -> moeda estrangeira (divide).
 * - `TO_BRL`: valor na moeda estrangeira -> reais (multiplica).
 */
export function convertWithRate(amount: number, rate: number, direction: FxDirection): number {
  if (!Number.isFinite(amount) || !isValidRate(rate)) return 0;
  return direction === 'BRL_TO' ? amount / rate : amount * rate;
}

/** Interpreta valores digitados aceitando vírgula decimal. */
export function parseAmount(raw: string): number {
  const n = parseFloat((raw ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** URL da Edge Function `fx-rate` (GET com query params). */
export function fxRateUrl(from: string, to: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/fx-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}
