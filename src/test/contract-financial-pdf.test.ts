import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import {
  buildContractPayload,
  buildContractNumber,
  validateContractPayload,
  formatPaymentMethodLabel,
} from '@/lib/saleContractData';
import { generateSaleContractPdf } from '@/lib/generateSaleContractPdf';

const sale: any = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  user_id: 'u1', client_name: 'Teste Beta Orlando', destination: 'Orlando, EUA',
  sale_amount: 61000, sale_date: '2026-07-29', start_date: '2026-09-10', end_date: '2026-09-20',
  payment_method: 'PIX e cartão de crédito', client_id: 'c1',
};
const products: any[] = [
  { id: 'p1', sale_id: sale.id, product_type: 'aereo', description: 'GRU/MCO', sale_price: 61000, cost_price: 40000, supplier_name: 'LATAM', operator_id: null, commission_type: 'percentage', commission_value: 10 },
];
const payments: any[] = [
  { id: 'y1', sale_id: sale.id, payment_date: '2026-07-29', amount: 20000, payment_method: 'pix' },
  { id: 'y2', sale_id: sale.id, payment_date: '2026-08-29', amount: 8000, payment_method: 'cartao_credito' },
];
const travelers: any[] = [
  { id: 't1', nome_completo: 'Teste Beta Orlando', data_nascimento: '1985-04-12', cpf: '529.982.247-25', passaporte: 'AB123', validade_passaporte: '2031-01-01', nacionalidade: 'Brasileira', observacoes: null, is_responsavel: true },
];
const template: any = {
  id: 'tpl1', agency_id: 'a1', name: 'Modelo', version: 1, status: 'active',
  contract_title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS TURÍSTICOS',
  legal_body_html: '<p>Cláusula 1ª — Do objeto.</p>',
  header_config: { trade_name: 'Travel.IN Viagens', legal_name: 'Travel.IN Viagens Ltda', cnpj: '34.025.037/0001-96', emission_city: 'Indaial' },
  footer_config: {}, signature_config: {}, logo_url: null, agency_data_snapshot: {},
};

function build(overrides: Record<string, unknown>) {
  return buildContractPayload({
    sale, products, payments,
    client: { id: 'c1', name: 'Teste Beta Orlando', email: 'a@b.com', phone: '(47) 90000-0000', city: 'Indaial' } as any,
    travelers, agencyProfile: { agency_name: 'Travel.IN Viagens', city: 'Indaial' } as any,
    operatorNames: {}, template, sections: [],
    overrides: {
      client_document: '529.982.247-25',
      payment_method: 'PIX e cartão de crédito, conforme pagamentos realizados e cronograma de parcelas abaixo.',
      installments_count: 6, installment_value: 5500, first_due_date: '2026-09-29',
      down_payment: 20000, paid_to_supplier: 5000,
      insurance_contracted: false, insurance_refusal_ack: true,
      ...overrides,
    } as any,
    contractNumber: buildContractNumber(sale.id, 1),
    revision: 1,
  });
}

async function pdfText(payload: any, file: string) {
  const blob = await generateSaleContractPdf(payload);
  const dataUrl = await new Promise<string>((res) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.readAsDataURL(blob as Blob);
  });
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
}

describe('formatação de métodos de pagamento', () => {
  it('padroniza para leitura humana', () => {
    expect(formatPaymentMethodLabel('pix')).toBe('PIX');
    expect(formatPaymentMethodLabel('credito')).toBe('cartão de crédito');
    expect(formatPaymentMethodLabel('cartao_credito')).toBe('cartão de crédito');
    expect(formatPaymentMethodLabel('credit')).toBe('cartão de crédito');
    expect(formatPaymentMethodLabel('debito')).toBe('cartão de débito');
    expect(formatPaymentMethodLabel('transferencia')).toBe('transferência bancária');
    expect(formatPaymentMethodLabel('carteira_digital')).toBe('Carteira digital');
    expect(formatPaymentMethodLabel('')).toBe('');
  });
});

describe('seção financeira do PDF', () => {
  let txt = '';
  let payload: any;
  beforeAll(async () => {
    payload = build({ financial_notes: '' });
    txt = await pdfText(payload, '/tmp/contrato-financeiro.pdf');
  });

  it('cálculo financeiro permanece inalterado', () => {
    expect(payload.financial.total).toBe(61000);
    expect(payload.financial.paid).toBe(28000);
    expect(payload.financial.pending).toBe(33000);
    expect(payload.financial.payment_summary).toBeTruthy();
    expect(validateContractPayload(payload).filter((i: any) => i.severity === 'error')).toEqual([]);
  });

  it('não imprime o bloco Composição do pagamento', () => {
    expect(txt).not.toMatch(/Composição do pagamento/i);
    expect(txt).not.toContain(payload.financial.payment_summary);
  });

  it('remove as linhas Entrada e Saldo genérico', () => {
    expect(txt).not.toMatch(/^\s*Entrada:/m);
    expect(txt).not.toMatch(/\bSaldo:/);
  });

  it('exibe os totais aprovados', () => {
    expect(txt).toContain('Total já recebido pela CONTRATADA');
    expect(txt).toContain('Saldo pendente atual');
    expect(txt).toMatch(/Saldo pendente atual:\s*R\$\s?33\.000,00/);
  });

  it('mostra cada pagamento recebido uma única vez e formatado', () => {
    expect(txt.match(/29\/07\/2026 — R\$ ?20\.000,00 via PIX — entrada/g)).toHaveLength(1);
    expect(txt.match(/29\/08\/2026 — R\$ ?8\.000,00 via cartão de crédito — pagamento adicional/g)).toHaveLength(1);
  });

  it('mostra cada parcela uma única vez e não repete datas em texto automático', () => {
    for (let n = 1; n <= 6; n++) {
      expect(txt.match(new RegExp(`Parcela ${n}/6`, 'g'))).toHaveLength(1);
    }
    expect(txt.match(/29\/09\/2026/g)).toHaveLength(1);
    expect(txt.match(/28\/02\/2027/g)).toHaveLength(1);
  });

  it('forma de pagamento aparece uma única vez', () => {
    expect(txt.match(/Forma de pagamento:/g)).toHaveLength(1);
    expect(txt).toContain('conforme pagamentos realizados e cronograma de parcelas abaixo.');
  });

  it('pagamento direto ao fornecedor: valor uma vez, explicação uma vez', () => {
    expect(txt.match(/Pago diretamente ao fornecedor:/g)).toHaveLength(1);
    expect(txt.match(/Valor informativo, pago pelo CONTRATANTE diretamente ao fornecedor/g)).toHaveLength(1);
    expect(txt).toContain('Observações financeiras');
  });

  it('cláusulas jurídicas permanecem no documento', () => {
    expect(txt).toMatch(/Cláusula 1ª/);
  });
});

describe('observação manual sobre fornecedor', () => {
  it('não duplica a nota automática', async () => {
    const payload = build({
      financial_notes:
        'O valor de R$ 5.000,00 foi pago diretamente pelo CONTRATANTE ao fornecedor e não compõe os valores recebidos pela CONTRATADA.',
    });
    const txt = await pdfText(payload, '/tmp/contrato-financeiro-manual.pdf');
    expect(txt).toMatch(/pago diretamente pelo CONTRATANTE ao fornecedor/);
    expect(txt).not.toMatch(/Valor informativo, pago pelo CONTRATANTE/);
    expect(txt.match(/foi pago diretamente pelo CONTRATANTE ao fornecedor/g)).toHaveLength(1);
  });
});
