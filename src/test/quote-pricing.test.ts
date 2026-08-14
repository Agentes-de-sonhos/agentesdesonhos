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

import { suggestPricingModeFromImport, isValidPricingDecision } from '@/lib/quotePricing';

describe('sugestão de modo na importação por IA', () => {
  it('total global 15000 com 5 serviços sem preço => package pré-selecionado', () => {
    const r = suggestPricingModeFromImport({ globalTotal: 15000, itemsSum: 0, warnings: [] });
    expect(r.pricingMode).toBe('package');
    expect(r.packageTotal).toBe(15000);
    expect(r.needsExplicitChoice).toBe(false);
  });

  it('warning de valor total sem valores individuais também sugere package', () => {
    const r = suggestPricingModeFromImport({
      globalTotal: 9800,
      itemsSum: 500,
      warnings: ['Valor total do pacote sem valores individuais por serviço'],
    });
    expect(r.pricingMode).toBe('package');
  });

  it('total global + soma individual > 0 não decide silenciosamente', () => {
    const r = suggestPricingModeFromImport({ globalTotal: 15000, itemsSum: 12000, warnings: [] });
    expect(r.pricingMode).toBe('itemized');
    expect(r.needsExplicitChoice).toBe(true);
    expect(r.mismatchWarning).toBeTruthy();
    expect(r.packageTotal).toBe(15000);
  });

  it('sem total global mantém itemized', () => {
    const r = suggestPricingModeFromImport({ globalTotal: null, itemsSum: 3000 });
    expect(r.pricingMode).toBe('itemized');
    expect(r.packageTotal).toBeNull();
    expect(r.needsExplicitChoice).toBe(false);
  });

  it('package sem valor/zero é rejeitado', () => {
    expect(isValidPricingDecision({ pricingMode: 'package', packageTotal: null })).toBe(false);
    expect(isValidPricingDecision({ pricingMode: 'package', packageTotal: 0 })).toBe(false);
    expect(isValidPricingDecision({ pricingMode: 'package', packageTotal: -5 })).toBe(false);
    expect(isValidPricingDecision({ pricingMode: 'package', packageTotal: 1 })).toBe(true);
    expect(isValidPricingDecision({ pricingMode: 'itemized' })).toBe(true);
  });
});
