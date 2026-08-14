import { describe, it, expect, vi } from 'vitest';
import { createPricingDecisionGate } from '@/lib/importPricingGate';
import { PACKAGE_TOTAL_REQUIRED_MESSAGE } from '@/lib/quotePricing';

describe('createPricingDecisionGate', () => {
  it('persiste a decisão antes de liberar a confirmação e é idempotente', async () => {
    const order: string[] = [];
    const gate = createPricingDecisionGate(async () => {
      order.push('persist');
    });
    const confirmService = () => order.push('confirm');

    const r1 = await gate.ensure({ pricingMode: 'package', packageTotal: 15000 });
    expect(r1).toEqual({ ok: true, persisted: true });
    confirmService();

    const r2 = await gate.ensure({ pricingMode: 'package', packageTotal: 15000 });
    expect(r2).toEqual({ ok: true, persisted: false });
    confirmService();

    expect(order).toEqual(['persist', 'confirm', 'confirm']);
  });

  it('bloqueia package sem valor', async () => {
    const persist = vi.fn();
    const gate = createPricingDecisionGate(persist);
    const r = await gate.ensure({ pricingMode: 'package', packageTotal: 0 });
    expect(r).toEqual({ ok: false, error: PACKAGE_TOTAL_REQUIRED_MESSAGE });
    expect(persist).not.toHaveBeenCalled();
  });

  it('propaga erro de persistência sem marcar como salvo', async () => {
    const persist = vi.fn().mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValueOnce(undefined);
    const gate = createPricingDecisionGate(persist);
    const r1 = await gate.ensure({ pricingMode: 'itemized', packageTotal: null });
    expect(r1).toEqual({ ok: false, error: 'falha de rede' });
    const r2 = await gate.ensure({ pricingMode: 'itemized', packageTotal: null });
    expect(r2).toEqual({ ok: true, persisted: true });
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it('serializa chamadas concorrentes gravando uma única vez', async () => {
    const persist = vi.fn().mockImplementation(() => new Promise((res) => setTimeout(res, 10)));
    const gate = createPricingDecisionGate(persist);
    const results = await Promise.all([
      gate.ensure({ pricingMode: 'package', packageTotal: 999 }),
      gate.ensure({ pricingMode: 'package', packageTotal: 999 }),
    ]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.ok && r.persisted).length).toBe(1);
  });
});
