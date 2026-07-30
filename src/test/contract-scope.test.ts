import { describe, it, expect } from 'vitest';
import { mergeScopeLines, parseScopeItems, sanitizeServiceData } from '@/lib/contractScope';

describe('sanitizeServiceData', () => {
  it('remove campos financeiros e sensíveis', () => {
    const out = sanitizeServiceData({
      hotel_name: 'Hotel X',
      meal_plan: 'Café da manhã',
      sale_price: 5000,
      cost_price: 4000,
      commission_value: 500,
      internal_notes: 'segredo',
      passenger_cpf: '123',
    });
    expect(out).toEqual({ hotel_name: 'Hotel X', meal_plan: 'Café da manhã' });
  });
});

describe('parseScopeItems', () => {
  it('valida schema, deduplica e filtra ids desconhecidos', () => {
    const items = parseScopeItems(
      {
        items: [
          { text: '- Hospedagem 5 noites', confidence: 'sourced', source_type: 'sale', source_ids: ['a', 'x'] },
          { text: 'Hospedagem 5 noites', confidence: 'sourced', source_type: 'sale' },
          { text: 'Passeios opcionais', confidence: 'suggested', source_type: 'sale' },
          { text: '' },
        ],
      },
      ['a'],
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ text: 'Hospedagem 5 noites', source_ids: ['a'] });
    // Sugestão sem lastro vira "general_suggestion".
    expect(items[1]).toMatchObject({ confidence: 'suggested', source_type: 'general_suggestion' });
  });
});

describe('mergeScopeLines', () => {
  it('append não perde conteúdo e deduplica', () => {
    const r = mergeScopeLines('Aéreo ida e volta', ['aéreo ida e volta', 'Transfer'], 'append');
    expect(r.text).toBe('Aéreo ida e volta\nTransfer');
    expect(r.applied).toBe(1);
  });
  it('replace substitui o conteúdo', () => {
    const r = mergeScopeLines('Antigo', ['Novo'], 'replace');
    expect(r.text).toBe('Novo');
  });
});