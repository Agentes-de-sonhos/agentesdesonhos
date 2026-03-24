export type QuoteCurrency = 'BRL' | 'USD' | 'EUR';
export type CurrencyMode = 'fixed' | 'conversion';

export const CURRENCY_OPTIONS: { value: QuoteCurrency; label: string; flag: string; symbol: string }[] = [
  { value: 'BRL', label: 'Real', flag: '🇧🇷', symbol: 'R$' },
  { value: 'USD', label: 'Dólar', flag: '🇺🇸', symbol: '$' },
  { value: 'EUR', label: 'Euro', flag: '🇪🇺', symbol: '€' },
];

export function getCurrencySymbol(currency: QuoteCurrency): string {
  return CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? 'R$';
}

export function getCurrencyFlag(currency: QuoteCurrency): string {
  return CURRENCY_OPTIONS.find((c) => c.value === currency)?.flag ?? '🇧🇷';
}

export function formatQuoteCurrency(value: number, currency: QuoteCurrency = 'BRL'): string {
  const localeMap: Record<QuoteCurrency, string> = {
    BRL: 'pt-BR',
    USD: 'en-US',
    EUR: 'de-DE',
  };
  return new Intl.NumberFormat(localeMap[currency], {
    style: 'currency',
    currency,
  }).format(value);
}

/** Extract currency info from a quote object (backward compatible) */
export function getQuoteCurrencyInfo(quote: any): {
  currency: QuoteCurrency;
  currencyMode: CurrencyMode;
  exchangeRate: number | null;
} {
  return {
    currency: (quote?.currency as QuoteCurrency) || 'BRL',
    currencyMode: (quote?.currency_mode as CurrencyMode) || 'fixed',
    exchangeRate: quote?.exchange_rate ?? null,
  };
}
