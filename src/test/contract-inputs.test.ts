import { describe, expect, it } from 'vitest';
import { maskDocument, validateDocument } from '@/lib/documentMask';
import { formatCurrencyInput, parseCurrencyInput, parsePastedCurrency } from '@/lib/currencyMask';

describe('documentMask', () => {
  it('mascara CPF e CNPJ dinamicamente', () => {
    expect(maskDocument('52998224725')).toBe('529.982.247-25');
    expect(maskDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(maskDocument('529.982.247-25')).toBe('529.982.247-25');
    expect(maskDocument('1122233300018199')).toBe('11.222.333/0001-81');
  });

  it('valida CPF', () => {
    expect(validateDocument('529.982.247-25').isValid).toBe(true);
    expect(validateDocument('111.111.111-11').error).toBe('CPF inválido');
    expect(validateDocument('123.456.789-00').error).toBe('CPF inválido');
  });

  it('valida CNPJ', () => {
    expect(validateDocument('11222333000181').isValid).toBe(true);
    expect(validateDocument('11222333000180').error).toBe('CNPJ inválido');
  });

  it('trata vazio e incompleto', () => {
    expect(validateDocument('').isEmpty).toBe(true);
    expect(validateDocument('123').error).toContain('completo');
  });
});

describe('currencyMask', () => {
  it('digita progressivamente com centavos', () => {
    expect(parseCurrencyInput('123456')).toBe(1234.56);
    expect(parseCurrencyInput('')).toBeNull();
    expect(formatCurrencyInput(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrencyInput(null)).toBe('');
  });

  it('aceita colagem com e sem máscara', () => {
    expect(parsePastedCurrency('1000')).toBe(1000);
    expect(parsePastedCurrency('1.000,50')).toBe(1000.5);
    expect(parsePastedCurrency('R$ 1.000,50')).toBe(1000.5);
    expect(parsePastedCurrency('1000.50')).toBe(1000.5);
    expect(parsePastedCurrency('1.234.567,89')).toBe(1234567.89);
    expect(parsePastedCurrency('abc')).toBeNull();
  });

  it('valores altos e zero', () => {
    expect(formatCurrencyInput(0)).toBe('R$ 0,00');
    expect(formatCurrencyInput(1234567.89)).toBe('R$ 1.234.567,89');
  });
});
