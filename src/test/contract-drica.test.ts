import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { buildContractPayload, buildContractNumber, hashPayload, validateContractPayload, type ContractDraftOverrides } from '@/lib/saleContractData';
import { generateSaleContractPdf } from '@/lib/generateSaleContractPdf';
import { resolvedSectionsText, listTokens } from '@/lib/contractSlots';
import { contractPdfPath } from '@/lib/contractPdfStorage';
import {
  DRICA_CONTRACT_TITLE, DRICA_FOOTER_TEXT, DRICA_RENDER_CONFIG, DRICA_SECTIONS, paragraphsToHtml,
} from '@/lib/contractTemplates/dricaViagens';

const DRICA_ID = '1c604e3c-01db-4587-88e6-ea7eccf55230';
const TRAVELIN_ID = 'c7f64e4f-a7d6-4bce-93f7-5e19c29b1d7c';

const dricaTemplate: any = {
  id: 'd41ca000-0000-4000-8000-000000000001', agency_id: DRICA_ID, name: 'Drica', version: 1, status: 'active',
  contract_title: DRICA_CONTRACT_TITLE, legal_body_html: '',
  header_config: { trade_name: 'DRICA VIAGENS', legal_name: 'Maralba Viagens e Turismo Ltda', cnpj: '11.636.130/0001-31', phone: '(21) 9 8790-7853', email: 'faleconosco@dricaviagens.rio', emission_city: 'Rio de Janeiro (RJ)' },
  footer_config: { show_pagination: true }, signature_config: { show_witnesses: true }, logo_url: null, agency_data_snapshot: {},
  render_config: DRICA_RENDER_CONFIG,
};
const dricaSections: any[] = DRICA_SECTIONS.map((s, i) => ({ id: s.section_key, template_id: dricaTemplate.id, section_key: s.section_key, title: s.title, body_html: paragraphsToHtml(s.paragraphs), display_order: i + 1, is_fixed: true }));

const travelinTemplate: any = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001', agency_id: TRAVELIN_ID, name: 'Travel.IN', version: 1, status: 'active',
  contract_title: 'Contrato de Prestação de Serviços Turísticos', legal_body_html: '<p>Cláusula Travel.IN — Indaial.</p>',
  header_config: { trade_name: 'Travel.IN Viagens', cnpj: '34.025.037/0001-96', emission_city: 'Indaial' },
  footer_config: { show_pagination: true }, signature_config: { show_witnesses: true }, logo_url: null, agency_data_snapshot: {},
};
const travelinSections: any[] = [{ id: 't1', template_id: travelinTemplate.id, section_key: 'clausula_12', title: '12. ELEIÇÃO DE FORO', body_html: '<p>Fica eleito o foro da comarca de Indaial.</p>', display_order: 1, is_fixed: true }];

const sale: any = { id: 'beta0000-0000-4000-8000-000000000001', user_id: DRICA_ID, client_name: 'TESTE BETA Contratante', destination: 'Lisboa, Portugal', sale_amount: 12000, start_date: '2027-03-10', end_date: '2027-03-20', payment_method: 'cartao_credito', client_id: 'c1' };
const products: any[] = [
  { id: 'p1', sale_id: sale.id, product_type: 'aereo', description: 'Aéreo GIG/LIS', sale_price: 7000, supplier_name: 'TESTE BETA Linhas Aéreas', operator_id: 'op1' },
  { id: 'p2', sale_id: sale.id, product_type: 'hotel', description: 'Hotel 10 noites', sale_price: 5000, supplier_name: 'Hotel TESTE BETA', operator_id: 'op1' },
];
const payments: any[] = [{ id: 'y1', sale_id: sale.id, payment_date: '2026-10-01', amount: 3000, payment_method: 'PIX' }];
const travelers: any[] = [
  { id: 't1', nome_completo: 'TESTE BETA Contratante', data_nascimento: '1980-01-01', cpf: '111.444.777-35', passaporte: null, validade_passaporte: null, nacionalidade: 'Brasileira', observacoes: null, is_responsavel: true },
  { id: 't2', nome_completo: 'TESTE BETA Filho Menor', data_nascimento: '2018-05-05', cpf: '222.555.888-00', passaporte: null, validade_passaporte: null, nacionalidade: 'Brasileira', observacoes: null, is_responsavel: false },
];
const complete: ContractDraftOverrides = {
  client_document: '111.444.777-35', client_address: 'Rua Fictícia TESTE BETA, 100 — Rio de Janeiro/RJ',
  client_marital_status: 'casado', client_profession: 'engenheiro', client_rg: '12.345.678-9',
  included: 'Passagem aérea GIG/LIS/GIG\nHospedagem 10 noites com café da manhã',
  installments_count: 3, installment_value: 3000, first_due_date: '2026-11-10',
  template_checks: { ack_documents_required: true },
  template_choices: { fare_refund_condition: 'nao_reembolsavel', image_use_authorization: 'sim' },
  insurance_contracted: true, insurance_insurer: 'Seguradora TESTE BETA',
};

const build = (template: any, sections: any[], overrides: ContractDraftOverrides) =>
  buildContractPayload({
    sale, products, payments, client: { id: 'c1', name: 'TESTE BETA Contratante', email: null, phone: null, city: null },
    travelers, agencyProfile: { agency_name: template.header_config.trade_name },
    operatorNames: { op1: 'TESTE BETA Operadora' }, template, sections, overrides,
    contractNumber: buildContractNumber(sale.id, 1), revision: 1,
  });

const body = () => DRICA_SECTIONS.flatMap((s) => s.paragraphs).join('\n');

describe('contrato Drica Viagens (modelo com campos embutidos)', () => {
  it('3) 48 cláusulas presentes e em ordem; títulos intermediários; autorização de imagem; Anexo 1 até o bloco 8', () => {
    const text = body();
    const nums = [...text.matchAll(/^Cláusula (\d+):/gm)].map((m) => Number(m[1]));
    expect(nums).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
    const titles = DRICA_SECTIONS.map((s) => s.title);
    for (const t of ['DO OBJETO DO CONTRATO', 'DOS VALORES E FORMA DE PAGAMETO', 'DO PAGAMENTO E INADIMPLEMENTO', 'DAS CONDIÇÕES GERAIS DO CONTRATO', 'DAS RESPONSABILIDADES DO CONTRATANTE', 'DAS RESPONSABILIDADES DA CONTRATADA', 'DAS CONDIÇÕES ESPECÍFICAS DO TRANSPORTE AÉREO', 'RESCISÃO/CANCELAMENTO', 'ELEIÇÃO DE FORO', 'AUTORIZAÇÃO DO USO DE IMAGEM'])
      expect(titles).toContain(t);
    const annex = DRICA_SECTIONS.at(-1)!.paragraphs;
    const blocks = annex.filter((p) => /^[1-8]\. /.test(p)).map((p) => Number(p[0]));
    expect(blocks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(annex.at(-1)).toMatch(/durante transfers ou passeios\.$/);
  });

  it('6) slots apenas nos pontos dinâmicos identificados', () => {
    const tokens = DRICA_SECTIONS.flatMap((s) => listTokens(paragraphsToHtml(s.paragraphs)));
    expect(new Set(tokens)).toEqual(new Set([
      'slot:contractor_name', 'slot:contractor_nationality', 'slot:contractor_marital_status', 'slot:contractor_profession', 'slot:contractor_rg', 'slot:contractor_cpf', 'slot:contractor_address',
      'list:included_services', 'slot:airlines', 'slot:operators', 'slot:travel_agency',
      'slot:total', 'slot:down_payment', 'slot:down_payment_date', 'slot:installments_count', 'slot:installment_value', 'slot:due_day', 'slot:payment_method',
      'table:passengers', 'check:ack_documents_required', 'choice:fare_refund_condition=nao_reembolsavel', 'choice:fare_refund_condition=reembolso_parcial',
      'slot:emission_day', 'slot:emission_month', 'slot:emission_year', 'signatures',
      'choice:image_use_authorization=sim', 'choice:image_use_authorization=nao', 'slot:image_auth_name', 'slot:image_auth_cpf',
      'choice:insurance=contratado', 'choice:insurance=recusado',
    ]));
    // Nenhum placeholder original restou no texto.
    expect(body()).not.toMatch(/\$\{[a-z]|\$\([a-z]|DESCREVER SERVIÇOS|NOME DA CIA|Nome e Sobrenome \+ CPF|\( \)/);
  });

  it('5–13, 16) resolve contratante, serviços, fornecedores, financeiro, passageiros, ciência, tarifa, seguro, imagem, data', () => {
    const p = build(dricaTemplate, dricaSections, complete);
    const t = resolvedSectionsText(p.sections);
    expect(t).toContain('Contratante: TESTE BETA Contratante, Brasileira, casado, engenheiro, portador da cédula de identidade RG nº 12.345.678-9, inscrito no CPF sob nº 111.444.777-35, com domicílio à Rua Fictícia TESTE BETA, 100 — Rio de Janeiro/RJ;');
    const idx = t.indexOf('descritos:');
    expect(t.slice(idx, idx + 120)).toContain('• Passagem aérea GIG/LIS/GIG');
    expect(t).toContain('fornecedor(es) TESTE BETA Linhas Aéreas, TESTE BETA Operadora, e DRICA VIAGENS, motivo');
    expect(t).toContain('o valor de R$ 12.000,00 da seguinte forma:');
    expect(t).toContain('entrada no valor de R$ 3.000,00 até a data de 01/10/2026');
    expect(t).toContain('dividido em 3 parcelas iguais de R$3.000,00 com vencimento estipulado no dia 10 cada mês');
    expect(t).toContain('mediante cartão de crédito.');
    expect(t).toMatch(/TESTE BETA Filho Menor \| 222\.555\.888-00/);
    expect(t).toContain('(X) Contratante/Passageiros declara o conhecimento');
    expect(t).toContain('(X) Contratante declara-se ciente que no presente contrato, de acordo com as normas estabelecidas pelos respectivos fornecedores, um ou mais');
    expect(t).toContain('( ) Contratante declara-se ciente que no presente contrato, de acordo com as normas estabelecidas pelos respectivos fornecedores, todos');
    expect(t).toContain('(X) Optei pela aquisição');
    expect(t).toContain('( ) Optei por não adquirir');
    expect(t).toContain('(X) SIM ( ) NÃO');
    expect(t).toContain('Eu, TESTE BETA Contratante, CPF 111.444.777-35, autorizo');
    expect(t).toMatch(/Rio de Janeiro \(RJ\), \d{1,2} de [a-zç]+ de 20\d\d\./);
    expect(validateContractPayload(p).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('8, 10–12) não informado bloqueia; recusado marca a 2ª opção; nunca marca sozinho', () => {
    const p = build(dricaTemplate, dricaSections, { client_document: '111.444.777-35', included: 'x', installments_count: 3, installment_value: 3000, first_due_date: '2026-11-10' });
    const t = resolvedSectionsText(p.sections);
    expect(t).not.toContain('(X)');
    const errs = validateContractPayload(p).filter((i) => i.severity === 'error').map((i) => i.field);
    for (const f of ['dyn_check:ack_documents_required', 'dyn_choice:fare_refund_condition', 'dyn_choice:insurance', 'dyn_choice:image_use_authorization', 'dyn_slot:contractor_rg'])
      expect(errs).toContain(f);
    const r = build(dricaTemplate, dricaSections, { ...complete, insurance_contracted: false, insurance_refusal_ack: true, template_choices: { fare_refund_condition: 'reembolso_parcial', image_use_authorization: 'nao' } });
    const rt = resolvedSectionsText(r.sections);
    expect(rt).toContain('( ) Optei pela aquisição');
    expect(rt).toContain('(X) Optei por não adquirir');
    expect(rt).toContain('( ) SIM (X) NÃO');
    expect((rt.match(/\(X\) Contratante declara-se ciente/g) ?? []).length).toBe(1);
  });

  it('1, 2, 14, 15, 17–21) coexistência, isolamento, menores/testemunhas, branding, PDF e hash', async () => {
    const d = build(dricaTemplate, dricaSections, complete);
    const ti = build(travelinTemplate, travelinSections, { client_document: '111.444.777-35' });
    expect(ti.render).toBeUndefined();
    expect(ti.dynamic).toBeUndefined();
    const dj = JSON.stringify(d);
    const tj = JSON.stringify(ti);
    expect(dj).not.toMatch(/Indaial|Travel\.IN/);
    expect(tj).not.toMatch(/DRICA|Maralba|Cláusula 48/);
    expect(dj).not.toMatch(/Agentes de Sonhos|Lovable/i);
    expect(d.signers).toEqual([]);
    const sig = d.sections.flatMap((s) => s.blocks ?? []).find((b) => b.kind === 'signatures') as any;
    expect(sig.def.witnesses).toBe(2);
    expect(JSON.stringify(sig)).not.toContain('Filho Menor');
    expect(d.render?.footer_text).toBe(DRICA_FOOTER_TEXT);

    const blob = await generateSaleContractPdf(d);
    const dataUrl = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(blob as Blob);
    });
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    writeFileSync('/tmp/drica-teste-beta.pdf', bytes);
    const sha = createHash('sha256').update(bytes).digest('hex');
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPayload(d)).toBe(hashPayload(JSON.parse(dj)));
    expect(contractPdfPath(DRICA_ID, sale.id, 'c1')).toBe(`${DRICA_ID}/${sale.id}/c1.pdf`);
    const raw = bytes.toString('latin1');
    expect(raw).not.toMatch(/Agentes de Sonhos|Lovable/i);
    writeFileSync('/tmp/drica-teste-beta.sha256', sha);

    const tblob = await generateSaleContractPdf(ti);
    expect(tblob.size).toBeGreaterThan(1000);
  });
});
