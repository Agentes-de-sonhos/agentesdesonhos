/**
 * Service-level payment utilities.
 * These functions are ONLY called when use_service_payment = true on the quote
 * AND is_custom_payment = true on the individual service.
 * They never modify global payment logic.
 */

export type ServicePaymentType = 'installments' | 'installments_with_entry' | 'full_payment';
export type ServiceDiscountType = 'percentage' | 'fixed';

export interface ServicePaymentConfig {
  is_custom_payment: boolean;
  payment_type: ServicePaymentType | null;
  installments: number | null;
  entry_value: number | null;
  discount_type: ServiceDiscountType | null;
  discount_value: number | null;
  payment_method: string | null;
}

export const EMPTY_SERVICE_PAYMENT: ServicePaymentConfig = {
  is_custom_payment: false,
  payment_type: null,
  installments: null,
  entry_value: null,
  discount_type: null,
  discount_value: null,
  payment_method: null,
};

export const SERVICE_PAYMENT_TYPE_LABELS: Record<ServicePaymentType, string> = {
  installments: 'Parcelado (sem entrada)',
  installments_with_entry: 'Parcelado com entrada',
  full_payment: 'À vista',
};

export const PAYMENT_METHOD_OPTIONS = [
  'Cartão de Crédito',
  'Pix',
  'Boleto',
  'Transferência Bancária',
];

/**
 * Calculate service payment display values.
 * Only called when use_service_payment AND is_custom_payment are both true.
 */
export function calculateServicePayment(amount: number, config: ServicePaymentConfig) {
  const type = config.payment_type || 'full_payment';

  if (type === 'installments') {
    const count = config.installments || 1;
    const installmentValue = amount / count;
    return {
      type: 'installments' as const,
      installmentCount: count,
      installmentValue,
      total: amount,
      method: config.payment_method,
    };
  }

  if (type === 'installments_with_entry') {
    const entryValue = config.entry_value || 0;
    const remainder = Math.max(amount - entryValue, 0);
    const count = config.installments || 1;
    const installmentValue = remainder / count;
    return {
      type: 'installments_with_entry' as const,
      entryValue,
      installmentCount: count,
      installmentValue,
      total: amount,
      method: config.payment_method,
    };
  }

  // full_payment
  let discountedTotal = amount;
  if (config.discount_type === 'percentage' && config.discount_value) {
    discountedTotal = amount * (1 - config.discount_value / 100);
  } else if (config.discount_type === 'fixed' && config.discount_value) {
    discountedTotal = Math.max(amount - config.discount_value, 0);
  }

  return {
    type: 'full_payment' as const,
    total: amount,
    discountedTotal,
    hasDiscount: discountedTotal < amount,
    method: config.payment_method,
  };
}

/**
 * Get a human-readable payment display string for a service.
 */
export function getServicePaymentDisplay(amount: number, config: ServicePaymentConfig): string {
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (!config.is_custom_payment || !config.payment_type) {
    return ''; // fallback to global
  }

  const result = calculateServicePayment(amount, config);

  if (result.type === 'installments') {
    return `${result.installmentCount}x de ${fmt(result.installmentValue)}${result.method ? ` no ${result.method}` : ''}`;
  }

  if (result.type === 'installments_with_entry') {
    return `Entrada ${fmt(result.entryValue)} + ${result.installmentCount}x de ${fmt(result.installmentValue)}${result.method ? ` no ${result.method}` : ''}`;
  }

  // full_payment
  if (result.hasDiscount) {
    return `${fmt(result.discountedTotal)} à vista${result.method ? ` via ${result.method}` : ''}`;
  }
  return `${fmt(result.total)} à vista${result.method ? ` via ${result.method}` : ''}`;
}

/**
 * Extract ServicePaymentConfig from a raw service record (from DB).
 * Handles missing/null fields gracefully for backward compatibility.
 */
export function extractServicePaymentConfig(service: any): ServicePaymentConfig {
  return {
    is_custom_payment: service.is_custom_payment ?? false,
    payment_type: service.payment_type ?? null,
    installments: service.installments ?? null,
    entry_value: service.entry_value ?? null,
    discount_type: service.discount_type ?? null,
    discount_value: service.discount_value ?? null,
    payment_method: service.payment_method ?? null,
  };
}
