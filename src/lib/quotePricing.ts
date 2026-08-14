/**
 * Regra única de cálculo do total do orçamento.
 *
 * Dois modos explícitos (`quotes.pricing_mode`):
 * - `itemized`: total = soma de `quote_services.amount` (comportamento histórico);
 * - `package`:  total = `quotes.package_total_amount` (valor fechado do pacote).
 *
 * `quotes.total_amount` continua sendo o cache do total efetivo usado pelo
 * resto do sistema; sempre atualize-o por `computeQuoteTotalForPersistence`.
 */

export type QuotePricingMode = 'itemized' | 'package';

/** Texto exibido ao cliente para serviços sem valor individual no modo pacote. */
export const PACKAGE_INCLUDED_LABEL = 'Incluído no valor do pacote';
/** Rótulo do card final de total no modo pacote. */
export const PACKAGE_TOTAL_LABEL = 'Valor total do pacote';

type AmountLike = { amount?: number | string | null };

export function getQuotePricingMode(quote: any): QuotePricingMode {
  return quote?.pricing_mode === 'package' ? 'package' : 'itemized';
}

export function isPackagePricing(quote: any): boolean {
  return getQuotePricingMode(quote) === 'package';
}

/** Valor fechado do pacote (0 quando ausente/inválido). */
export function getPackageTotalAmount(quote: any): number {
  const value = Number(quote?.package_total_amount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function sumServiceAmounts(services?: AmountLike[] | null): number {
  return (services || []).reduce((sum, s) => sum + (Number(s?.amount) || 0), 0);
}

/**
 * Total efetivo do orçamento. Use SEMPRE esta função em vez de somar
 * `services.amount` diretamente.
 */
export function getEffectiveQuoteTotal(quote: any, services?: AmountLike[] | null): number {
  if (!quote) return 0;
  const cached = Number(quote.total_amount) || 0;
  if (isPackagePricing(quote)) {
    return getPackageTotalAmount(quote) || cached;
  }
  const list = services ?? quote.services;
  if (Array.isArray(list) && list.length > 0) return sumServiceAmounts(list);
  return cached;
}

/** Total a persistir em `quotes.total_amount`, respeitando o modo. */
export function computeQuoteTotalForPersistence(input: {
  pricingMode: QuotePricingMode;
  packageTotal?: number | null;
  servicesSum: number;
}): number {
  if (input.pricingMode === 'package') {
    const value = Number(input.packageTotal);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  return Number(input.servicesSum) || 0;
}

/** No modo pacote, serviços sem valor não devem exibir R$ 0,00 ao cliente. */
export function shouldHideServiceAmount(quote: any, amount?: number | string | null): boolean {
  if (!isPackagePricing(quote)) return false;
  return !(Number(amount) > 0);
}
