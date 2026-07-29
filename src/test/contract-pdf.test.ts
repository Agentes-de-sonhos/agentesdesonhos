import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import { buildContractPayload, buildContractNumber, hashPayload, validateContractPayload } from '@/lib/saleContractData';
import { generateSaleContractPdf } from '@/lib/generateSaleContractPdf';

const sale: any = {
  id: '11111111-2222-3333-4444-555555555555',
  user_id: 'u1', client_name: 'Maria Aparecida de Souza', destination: 'Orlando, EUA',
  sale_amount: 42350.9, sale_date: '2026-08-01', start_date: '2026-12-20', end_date: '2027-01-03',
  payment_method: 'Cartão de crédito parcelado', client_id: 'c1',
};
const products: any[] = [
  { id: 'p1', sale_id: sale.id, product_type: 'aereo', description: 'Passagem aérea GRU/MCO — bagagem 1x23kg por passageiro', sale_price: 18500.5, cost_price: 15000, supplier_name: 'LATAM Airlines', operator_id: 'op1', commission_type: 'percentage', commission_value: 10 },
  { id: 'p2', sale_id: sale.id, product_type: 'hotel', description: 'Resort 7 noites — resort fee USD 35/dia pago no destino', sale_price: 16200, cost_price: 13000, supplier_name: 'Hilton Orlando', operator_id: null, commission_type: 'percentage', commission_value: 10 },
  { id: 'p3', sale_id: sale.id, product_type: 'seguro', description: 'Seguro viagem internacional — tarifa não reembolsável', sale_price: 1650.4, cost_price: 1200, supplier_name: null, operator_id: 'op2', commission_type: 'percentage', commission_value: 10 },
];
const payments: any[] = [
  { id: 'y1', sale_id: sale.id, payment_date: '2026-08-05', amount: 10000, payment_method: 'PIX' },
  { id: 'y2', sale_id: sale.id, payment_date: '2026-09-05', amount: 5000, payment_method: 'Cartão' },
];
const travelers: any[] = [
  { id: 't1', nome_completo: 'Maria Aparecida de Souza', data_nascimento: '1985-03-14', cpf: '123.456.789-09', passaporte: 'FX123456', validade_passaporte: '2030-05-01', nacionalidade: 'Brasileira', observacoes: null, is_responsavel: true },
  { id: 't2', nome_completo: 'João Pedro de Souza', data_nascimento: '2015-11-30', cpf: null, passaporte: 'FX998877', validade_passaporte: '2029-02-10', nacionalidade: 'Brasileira', observacoes: null, is_responsavel: false },
  { id: 't3', nome_completo: 'Ana Clara de Souza', data_nascimento: '2025-06-01', cpf: null, passaporte: null, validade_passaporte: null, nacionalidade: null, observacoes: null, is_responsavel: false },
];
const template: any = {
  id: 'tpl1', agency_id: 'a1', name: 'Modelo Teste', version: 1, status: 'active',
  contract_title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS TURÍSTICOS',
  legal_body_html: '<p>Cláusula 1ª — Do objeto. Ação, coração, informação — açúcar. Multa de 5% (cinco por cento).</p>',
  header_config: { trade_name: 'Travel.IN Viagens', legal_name: 'Travel.IN Viagens Ltda', cnpj: '34.025.037/0001-96', address: 'Rua X, 100 — Indaial/SC', phone: '(47) 99999-0000', email: 'contato@travelin.com.br', emission_city: 'Indaial', cadastur: '12.345678.90-1' },
  footer_config: { note: 'Travel.IN Viagens — Indaial/SC', show_pagination: true },
  signature_config: { show_passenger_signatures: true, show_witnesses: true, representative_name: 'Fulano', representative_role: 'Sócio' },
  logo_url: null, agency_data_snapshot: {},
};

describe('contrato de venda', () => {
  it('gera payload e PDF sem dados confidenciais', async () => {
    const payload = buildContractPayload({
      sale, products, payments,
      client: { id: 'c1', name: 'Maria Aparecida de Souza', email: 'maria@ex.com', phone: '(47) 98888-1111', city: 'Indaial' },
      travelers, agencyProfile: { agency_name: 'Travel.IN Viagens', city: 'Indaial' },
      operatorNames: { op1: 'CVC Consolidadora', op2: 'Hilton Orlando' },
      template, sections: [{ id: 's1', template_id: 'tpl1', section_key: 'c2', title: 'Cláusula 2ª — Do pagamento', body_html: '<p>Multa de 5% sobre o valor.</p>', display_order: 1, is_fixed: true }],
      overrides: {
        client_document: '123.456.789-09', client_address: 'Rua das Flores, 25 — Indaial/SC',
        discounts: 500, taxes: 320.75, service_fee: 250, down_payment: 10000, paid_to_supplier: 2000,
        installments_count: 10, payment_method: 'Cartão de crédito 10x', due_dates: 'Todo dia 05',
        included: 'Aéreo\nHospedagem', not_included: 'Refeições\nPasseios',
        conditions_penalties: 'Cancelamento sujeito a multa da operadora.',
        conditions_baggage: '1 bagagem de 23kg por passageiro.',
        conditions_documentation: 'Passaporte válido e visto americano.',
        insurance_contracted: true, insurance_insurer: 'Assist Card', insurance_plan: 'AC60', insurance_validity: '20/12/2026 a 03/01/2027', insurance_coverage: 'USD 60.000',
        attachments: 'Voucher do hotel\nBilhete aéreo',
      },
      contractNumber: buildContractNumber(sale.id, 1),
      revision: 1,
    });

    const json = JSON.stringify(payload).toLowerCase();
    for (const forbidden of ['cost_price', 'commission', 'markup', 'margem', 'lucro']) {
      expect(json.includes(forbidden), `vazou: ${forbidden}`).toBe(false);
    }
    expect(payload.passengers.map((p) => p.category)).toEqual(['adulto', 'crianca', 'bebe']);
    expect(payload.services[0].operator).toBe('CVC Consolidadora');
    expect(payload.services[1].operator).toBeUndefined();
    expect(payload.services[2].supplier).toBeUndefined();
    // op2 = mesmo nome do fornecedor em p3? não: p3 sem fornecedor → operadora mantida
    expect(payload.services[2].operator).toBe('Hilton Orlando');
    expect(payload.financial.total).toBeCloseTo(36421.65, 2);
    expect(validateContractPayload(payload).filter((i) => i.severity === 'error')).toEqual([]);
    expect(hashPayload(payload)).toHaveLength(16);

    const blob = await generateSaleContractPdf(payload);
    const buf = Buffer.from(await blob.arrayBuffer());
    writeFileSync('/tmp/contrato-teste.pdf', buf);
    expect(buf.length).toBeGreaterThan(5000);
  });
});
