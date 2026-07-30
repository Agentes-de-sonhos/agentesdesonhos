import { describe, it, expect } from 'vitest';
import { addMonthsKeepingDay, buildPaymentPlan, buildSigners } from '@/lib/saleContractData';
import type { ContractPassenger } from '@/types/contracts';

const pay = (date: string, amount: number, method = 'pix') => ({ date, amount, method });

describe('cronograma de parcelas', () => {
  it('mantém o dia e ajusta para o último dia do mês curto', () => {
    expect(addMonthsKeepingDay('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsKeepingDay('2026-09-29', 5)).toBe('2027-02-28');
    expect(addMonthsKeepingDay('2026-09-15', 3)).toBe('2026-12-15');
  });

  it('gera parcelas somente após o último pagamento recebido', () => {
    const plan = buildPaymentPlan({
      total: 61000,
      currency: 'BRL',
      payments: [pay('2026-07-29', 20000), pay('2026-08-29', 8000, 'credito')],
      installmentsCount: 6,
      installmentValue: 5500,
      firstDueDate: '2026-09-29',
    });
    expect(plan.paid).toBe(28000);
    expect(plan.pending).toBe(33000);
    expect(plan.schedule).toHaveLength(6);
    expect(plan.schedule[0].due_date).toBe('2026-09-29');
    expect(plan.schedule.every((i) => i.due_date > '2026-08-29')).toBe(true);
    expect(plan.received[0].kind).toBe('entrada');
    expect(plan.received[1].kind).toBe('adicional');
  });

  it('não inventa cronograma sem data do 1º vencimento', () => {
    const plan = buildPaymentPlan({
      total: 10000,
      currency: 'BRL',
      payments: [pay('2026-01-10', 4000)],
      installmentsCount: 3,
      installmentValue: 2000,
    });
    expect(plan.schedule).toEqual([]);
    expect(plan.pending).toBe(6000);
  });

  it('marca contrato quitado quando não há saldo', () => {
    const plan = buildPaymentPlan({
      total: 5000,
      currency: 'BRL',
      payments: [pay('2026-01-10', 5000)],
    });
    expect(plan.pending).toBe(0);
    expect(plan.summary).toContain('quitado');
  });
});

describe('assinantes', () => {
  const passengers: ContractPassenger[] = [
    { name: 'Adulto Um', category: 'adulto', is_minor: false, cpf: '111' },
    { name: 'Adulto Dois', category: 'adulto', is_minor: false },
    { name: 'Crianca', category: 'crianca', is_minor: true },
    { name: 'Bebe', category: 'bebe', is_minor: true },
  ];

  it('inclui apenas adultos explicitamente marcados', () => {
    const signers = buildSigners(passengers, ['Adulto Um']);
    expect(signers).toEqual([{ name: 'Adulto Um', role: 'anuente', document: '111' }]);
  });

  it('nunca cria assinatura para menores, mesmo se marcados', () => {
    expect(buildSigners(passengers, ['Crianca', 'Bebe'])).toEqual([]);
  });

  it('não cria assinaturas quando nada foi marcado', () => {
    expect(buildSigners(passengers, [])).toEqual([]);
  });
});
