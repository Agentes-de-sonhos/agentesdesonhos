import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { buildContractPayload, buildContractNumber, hashPayload, validateContractPayload } from '@/lib/saleContractData';
import { generateSaleContractPdf } from '@/lib/generateSaleContractPdf';

const F = JSON.parse(readFileSync('/tmp/fixture-input.json', 'utf8'));

describe('fixture orlando', () => {
  it('gera contrato', async () => {
    const payload = buildContractPayload({
      sale: F.sale, products: F.products, payments: F.payments,
      client: F.client, travelers: F.travelers,
      agencyProfile: F.profile, operatorNames: F.operators,
      template: F.template, sections: F.sections,
      contractNumber: buildContractNumber(F.sale.id, 1, new Date('2026-07-29T12:00:00')),
      revision: 1,
      overrides: {
        client_document: '529.982.247-25',
        client_person_type: 'fisica',
        client_address: 'Rua Teste Beta, 100, Apto 12, Vila Teste, São Paulo/SP, CEP 05000-000',
        client_birth_date: '1985-04-12',
        client_nationality: 'Brasileira',
        client_is_passenger: true,
        financial_responsible: 'TESTE BETA — Responsável Financeiro da Família',
        emission_city: 'Indaial',
        seller_name: 'TESTE BETA — Consultor Responsável',
        external_reference: 'FIXTURE_CONTRATO_COMPLETO_ORLANDO_2026_V1',
        trip_title: 'Pacote Completo Orlando — TESTE BETA',
        trip_scope: 'internacional',
        trip_origin: 'São Paulo/SP',
        trip_purpose: 'Viagem de lazer em família com foco em parques temáticos.',
        trip_program_note: 'Programação livre; passeios e parques conforme datas dos ingressos emitidos.',
        included: 'Passagem aérea ida e volta GRU–MCO para 4 passageiros\nHospedagem de 10 noites em apartamento familiar com café da manhã\nTransfer privativo aeroporto–hotel–aeroporto com bebê conforto\nIngressos de parques Disney (4 dias) e Universal (2 dias) para 3 pagantes\nSeguro viagem internacional para os 4 passageiros\nLocação de SUV intermediário por 10 diárias com proteção completa',
        not_included: 'Refeições não citadas neste contrato\nResort fee do hotel, pago diretamente no destino\nCombustível, pedágios e estacionamento do veículo locado\nGorjetas, despesas pessoais e passeios opcionais\nTaxas de emissão de visto e vacinas',
        payment_method: 'Entrada via PIX e saldo parcelado no cartão de crédito',
        installments_count: 6,
        installment_value: 5500,
        first_due_date: '2026-09-29',
        down_payment: 20000,
        paid_to_supplier: 5000,
        discounts: 1000,
        taxes: 450,
        service_fee: 550,
        financial_notes: 'Valores em reais (BRL). O saldo pendente considera apenas os pagamentos recebidos pela CONTRATADA.',
        insurance_contracted: true,
        insurance_insurer: 'Assist Card',
        insurance_plan: 'AC 60 Internacional',
        insurance_validity: '10/09/2026 a 20/09/2026',
        insurance_coverage: 'Despesas médicas e hospitalares USD 60.000, bagagem extraviada USD 1.200, cancelamento de viagem USD 2.000 e traslado sanitário.',
        insurance_covered: 'Os 4 passageiros indicados neste contrato.',
        insurance_refusal_ack: false,
        conditions_penalties: 'Cancelamento até 60 dias antes do embarque: multa de 10% sobre o valor total. Entre 59 e 30 dias: 30%. Entre 29 e 15 dias: 50%. A menos de 15 dias ou no-show: 100%, somadas às multas dos fornecedores. Bilhetes aéreos e ingressos são não reembolsáveis.',
        conditions_no_show: 'O não comparecimento em qualquer serviço contratado implica perda integral do valor, sem direito a reembolso ou remarcação.',
        conditions_baggage: '1 bagagem despachada de 23kg e 1 bagagem de mão de 10kg por passageiro pagante. Bebê de colo não possui franquia de bagagem despachada.',
        conditions_destination_fees: 'Resort fee de USD 35,00 por diária e taxa de estacionamento do hotel são pagos diretamente no destino pelo CONTRATANTE.',
        conditions_documentation: 'Passaporte com validade mínima de 6 meses, visto americano B1/B2 vigente e autorização eletrônica quando aplicável. Exigências sanitárias: comprovante de vacinação conforme regras vigentes na data do embarque. É de responsabilidade exclusiva do CONTRATANTE a regularidade da documentação.',
        conditions_minors: 'Os menores TESTE BETA — Lucas Criança Orlando e TESTE BETA — Sofia Bebê Orlando viajam acompanhados de ambos os pais; caso haja alteração, será exigida autorização judicial ou documento com firma reconhecida.',
        conditions_general: 'Alterações de itinerário solicitadas após a emissão estão sujeitas a taxas dos fornecedores e à disponibilidade. Contrato de teste beta — FIXTURE_CONTRATO_COMPLETO_ORLANDO_2026_V1.',
        attachments: 'Voucher de hospedagem do hotel em Orlando\nBilhetes aéreos eletrônicos GRU–MCO ida e volta\nVouchers de ingressos dos parques temáticos\nApólice do seguro viagem internacional\nVoucher do transfer privativo\nVoucher da locação de veículo',
        passenger_ids: F.travelers.map((t: any) => t.id),
        signatory_ids: F.travelers
          .filter((t: any) => t.data_nascimento && t.data_nascimento < '2008-01-01')
          .map((t: any) => t.id),
      },
    });
    const issues = validateContractPayload(payload);
    writeFileSync('/tmp/fixture-payload.json', JSON.stringify({ payload, issues, hash: hashPayload(payload) }, null, 2));
    console.log('ISSUES', JSON.stringify(issues));
    console.log('HASH', hashPayload(payload));
    console.log('FIN', JSON.stringify(payload.financial));
    console.log('SIGNERS', payload.signers.map((s) => s.name).join(' | '));
    console.log('SCHED', payload.financial.schedule.map((i) => `${i.number}:${i.due_date}:${i.amount}`).join(' | '));
    console.log('SUMMARY', payload.financial.payment_summary);
    console.log('CATS', payload.passengers.map((p) => `${p.name}=${p.category}/${p.age_at_trip}`).join(' | '));
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);

    const blob = await generateSaleContractPdf(payload);
    const dataUrl = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(blob as Blob);
    });
    writeFileSync('/tmp/contrato-fixture.pdf', Buffer.from(dataUrl.split(',')[1], 'base64'));
  });
});
