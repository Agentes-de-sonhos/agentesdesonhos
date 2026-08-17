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

/**
 * Layout de apresentação do investimento (item 3 do wizard).
 * `legacy` = orçamentos antigos sem escolha explícita.
 */
export type InvestmentPresentationLayout = 'consolidated' | 'ungrouped' | 'grouped' | 'legacy';

export function getInvestmentPresentationLayout(quote: any): InvestmentPresentationLayout {
  const value = quote?.investment_summary_layout;
  return value === 'consolidated' || value === 'ungrouped' || value === 'grouped' ? value : 'legacy';
}

/**
 * O valor total manual (pacote fechado) só esconde os valores individuais
 * quando a modalidade apresentada é o total consolidado. Em "valores
 * detalhados por serviço" e "agrupar por tipo de serviço", os valores
 * cadastrados continuam visíveis e apenas o total geral usa o valor manual.
 */
export function hidesIndividualAmounts(quote: any): boolean {
  if (!isPackagePricing(quote)) return false;
  const layout = getInvestmentPresentationLayout(quote);
  return layout === 'consolidated' || layout === 'legacy';
}

/** Serviço sem valor informado (null/undefined/''). Zero explícito = gratuito intencional. */
export function isServiceAmountMissing(service: AmountLike | null | undefined): boolean {
  const raw = service?.amount;
  if (raw === null || raw === undefined || raw === '') return true;
  return !Number.isFinite(Number(raw));
}

export interface QuoteTotalState {
  /** true quando existe um valor total definido manualmente. */
  manual: boolean;
  manualAmount: number;
  servicesSum: number;
  /** Total efetivo apresentado ao cliente. */
  total: number;
  servicesCount: number;
  servicesWithoutValue: number;
  /** true quando ao menos um serviço tem valor > 0. */
  hasAnyServiceValue: boolean;
}

/** Estado do bloco "Valor total do orçamento" na área administrativa. */
export function computeQuoteTotalState(quote: any, services?: AmountLike[] | null): QuoteTotalState {
  const list = (services ?? quote?.services ?? []) as AmountLike[];
  const servicesSum = sumServiceAmounts(list);
  const manualAmount = getPackageTotalAmount(quote);
  const manual = isPackagePricing(quote) && manualAmount > 0;
  return {
    manual,
    manualAmount,
    servicesSum,
    total: manual ? manualAmount : servicesSum,
    servicesCount: list.length,
    servicesWithoutValue: list.filter((s) => isServiceAmountMissing(s)).length,
    hasAnyServiceValue: list.some((s) => Number(s?.amount) > 0),
  };
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

/**
 * Validação defensiva: `package` exige um valor fechado finito e maior que zero.
 * Usada na UI (antes de habilitar o botão) e no hook (antes de gravar no banco).
 */
export function isValidPricingDecision(input: {
  pricingMode: QuotePricingMode;
  packageTotal?: number | null;
}): boolean {
  if (input.pricingMode !== 'package') return true;
  const value = Number(input.packageTotal);
  return Number.isFinite(value) && value > 0;
}

export const PACKAGE_TOTAL_REQUIRED_MESSAGE =
  'Informe o valor total do pacote (maior que zero) para usar o valor fechado.';

/** Avisos da IA que indicam total global sem valores individuais. */
function warnsPackageWithoutItemValues(warnings?: string[] | null): boolean {
  return (warnings || []).some((w) => {
    const text = String(w || '').toLowerCase();
    const mentionsTotal = text.includes('valor total') || text.includes('total do pacote');
    const mentionsMissingItems =
      text.includes('sem valores individuais') ||
      text.includes('sem valor individual') ||
      text.includes('sem valores por serviço') ||
      text.includes('sem valores por servico');
    return mentionsTotal && mentionsMissingItems;
  });
}

export interface ImportPricingSuggestion {
  pricingMode: QuotePricingMode;
  /** Valor fechado sugerido (total global extraído), quando houver. */
  packageTotal: number | null;
  /** true quando existem total global E valores individuais: exige decisão explícita. */
  needsExplicitChoice: boolean;
  /** Aviso comparativo mostrado na etapa de resumo (ou null). */
  mismatchWarning: string | null;
}

/**
 * Sugestão de modo de precificação a partir do resultado da importação por IA.
 * Função pura — testada em `src/test/quote-pricing.test.ts`.
 */
export function suggestPricingModeFromImport(input: {
  globalTotal?: number | string | null;
  itemsSum?: number | string | null;
  warnings?: string[] | null;
}): ImportPricingSuggestion {
  const globalTotal = Number(input.globalTotal);
  const total = Number.isFinite(globalTotal) && globalTotal > 0 ? globalTotal : 0;
  const itemsSumRaw = Number(input.itemsSum);
  const itemsSum = Number.isFinite(itemsSumRaw) && itemsSumRaw > 0 ? itemsSumRaw : 0;

  if (total <= 0) {
    return { pricingMode: 'itemized', packageTotal: null, needsExplicitChoice: false, mismatchWarning: null };
  }

  if (itemsSum <= 0 || warnsPackageWithoutItemValues(input.warnings)) {
    return { pricingMode: 'package', packageTotal: total, needsExplicitChoice: false, mismatchWarning: null };
  }

  return {
    pricingMode: 'itemized',
    packageTotal: total,
    needsExplicitChoice: true,
    mismatchWarning:
      'A IA encontrou um valor total do pacote e também valores individuais nos serviços. Escolha como o orçamento deve ser calculado.',
  };
}