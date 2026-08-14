import { describe, it, expect } from 'vitest';
import {
  computeQuoteTotalForPersistence,
  getEffectiveQuoteTotal,
  getPackageTotalAmount,
  getQuotePricingMode,
  isPackagePricing,
  shouldHideServiceAmount,
  sumServiceAmounts,
} from '@/lib/quotePricing';

const services = [{ amount: 1000 }, { amount: 250.5 }, { amount: null }];

describe('quotePricing', () => {
  it('padrão é itemizado (compatibilidade com orçamentos antigos)', () => {
    expect(getQuotePricingMode({})).toBe('itemized');
    expect(getQuotePricingMode({ pricing_mode: null })).toBe('itemized');
    expect(isPackagePricing({ pricing_mode: 'package' })).toBe(true);
  });

  it('soma os serviços no modo itemizado', () => {
    expect(sumServiceAmounts(services)).toBe(1250.5);
    expect(getEffectiveQuoteTotal({ total_amount: 9 }, services)).toBe(1250.5);
  });

  it('usa total_amount quando não há serviços', () => {
    expect(getEffectiveQuoteTotal({ total_amount: 800 }, [])).toBe(800);
  });

  it('usa o valor fechado no modo pacote, ignorando a soma dos serviços', () => {
    const quote = { pricing_mode: 'package', package_total_amount: 7000, total_amount: 7000 };
    expect(getEffectiveQuoteTotal(quote, services)).toBe(7000);
    expect(getPackageTotalAmount(quote)).toBe(7000);
  });

  it('cai para total_amount quando o valor de pacote está ausente', () => {
    expect(getEffectiveQuoteTotal({ pricing_mode: 'package', total_amount: 500 }, services)).toBe(500);
  });

  it('persistência respeita o modo', () => {
    expect(computeQuoteTotalForPersistence({ pricingMode: 'itemized', servicesSum: 1250.5 })).toBe(1250.5);
    expect(computeQuoteTotalForPersistence({ pricingMode: 'package', packageTotal: 7000, servicesSum: 1250.5 })).toBe(7000);
    expect(computeQuoteTotalForPersistence({ pricingMode: 'package', packageTotal: null, servicesSum: 1250.5 })).toBe(0);
  });

  it('esconde valor individual apenas no modo pacote', () => {
    expect(shouldHideServiceAmount({ pricing_mode: 'package' }, 1000)).toBe(false);
    expect(shouldHideServiceAmount({ pricing_mode: 'package' }, 0)).toBe(true);
    expect(shouldHideServiceAmount({}, 0)).toBe(false);
  });
});
