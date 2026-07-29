/**
 * Máscara e parsing de moeda brasileira (BRL) para inputs de texto.
 * Armazena sempre número em reais (com centavos), nunca centavos inteiros.
 */

/** Converte texto digitado/colado em número de reais. Retorna null quando vazio. */
export function parseCurrencyInput(raw: string): number | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  // Trata os dois últimos dígitos como centavos (digitação progressiva).
  return Number(digits) / 100;
}

/** Formata um número de reais como "1.234,56" (sem prefixo). */
export function formatCurrencyDigits(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata para exibição no input: "R$ 1.234,56". Vazio quando null/undefined. */
export function formatCurrencyInput(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return `R$ ${formatCurrencyDigits(value)}`;
}

/**
 * Interpreta colagem de valores já formatados: "1000", "1.000,50", "R$ 1.000,50",
 * "1000.50" (ponto decimal). Retorna null quando não houver dígitos.
 */
export function parsePastedCurrency(raw: string): number | null {
  const cleaned = (raw ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!cleaned || !/\d/.test(cleaned)) return null;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;
  if (hasComma && hasDot) {
    // pt-BR: ponto é milhar, vírgula é decimal
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  } else if (hasDot) {
    const parts = cleaned.split('.');
    const last = parts[parts.length - 1];
    // "1.000" => milhar; "1000.50" => decimal
    normalized = last.length === 3 && parts.length > 1 ? parts.join('') : cleaned;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
