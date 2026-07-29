import { formatCNPJ, formatCPF, isValidCNPJ, isValidCPF } from '@/lib/validators';

export type DocumentKind = 'cpf' | 'cnpj' | 'unknown';

/** Apenas dígitos, limitado a 14 (tamanho máximo de um CNPJ). */
export function onlyDocumentDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '').slice(0, 14);
}

export function documentKind(value: string): DocumentKind {
  const digits = onlyDocumentDigits(value);
  if (digits.length === 11) return 'cpf';
  if (digits.length === 14) return 'cnpj';
  return 'unknown';
}

/** Máscara dinâmica: CPF até 11 dígitos, CNPJ a partir de 12. */
export function maskDocument(value: string): string {
  const digits = onlyDocumentDigits(value);
  if (digits.length <= 11) return formatCPF(digits);
  return formatCNPJ(digits);
}

export interface DocumentValidation {
  digits: string;
  masked: string;
  kind: DocumentKind;
  isEmpty: boolean;
  isValid: boolean;
  error: string | null;
}

export function validateDocument(value: string): DocumentValidation {
  const digits = onlyDocumentDigits(value);
  const masked = maskDocument(digits);
  const kind = documentKind(digits);
  if (!digits) {
    return { digits, masked, kind, isEmpty: true, isValid: false, error: null };
  }
  if (kind === 'cpf') {
    const ok = isValidCPF(digits);
    return { digits, masked, kind, isEmpty: false, isValid: ok, error: ok ? null : 'CPF inválido' };
  }
  if (kind === 'cnpj') {
    const ok = isValidCNPJ(digits);
    return { digits, masked, kind, isEmpty: false, isValid: ok, error: ok ? null : 'CNPJ inválido' };
  }
  return {
    digits,
    masked,
    kind,
    isEmpty: false,
    isValid: false,
    error: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) completo',
  };
}
