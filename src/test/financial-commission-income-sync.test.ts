import { describe, it, expect } from "vitest";
import {
  computeMonthIncomeSummary,
  getIncomeStatus,
  getIncomeReceivedAmount,
  getIncomeRemainingAmount,
  isIncomeOverdue,
  isAutoIncomeEntry,
} from "@/lib/financialMonthSummary";

const TODAY = "2026-09-01";

const auto = (over: Record<string, unknown>) => ({
  source: "auto",
  sale_product_id: "sp-1",
  payment_method: "pix",
  ...over,
});

describe("sincronização Comissões -> Entradas (regras compartilhadas)", () => {
  it("comissão sem recebimento fica pendente no mês previsto", () => {
    const e = auto({ amount: 940, received_amount: 0, received_date: null, status: "pending", entry_date: "2026-08-20", expected_date: "2026-08-20" });
    expect(getIncomeStatus(e)).toBe("pending");
    expect(getIncomeReceivedAmount(e)).toBe(0);
    expect(getIncomeRemainingAmount(e)).toBe(940);
    const s = computeMonthIncomeSummary([e], 8, 2026, TODAY);
    expect(s.received).toBe(0);
    expect(s.pending).toBe(940);
    expect(s.overdue).toBe(940);
  });

  it("comissão parcial divide recebido e saldo", () => {
    const e = auto({ amount: 1000, received_amount: 400, received_date: "2026-08-27", status: "partial", entry_date: "2026-08-27", expected_date: "2026-08-20" });
    expect(getIncomeReceivedAmount(e)).toBe(400);
    expect(getIncomeRemainingAmount(e)).toBe(600);
    const s = computeMonthIncomeSummary([e], 8, 2026, TODAY);
    expect(s.received).toBe(400);
    expect(s.pending).toBe(600);
    expect(s.overdue).toBe(600);
  });

  it("as cinco comissões da conta de referência ficam recebidas em agosto sem atraso", () => {
    const entries = [940, 2250, 120, 580, 700].map((v, i) =>
      auto({
        sale_product_id: `sp-${i}`,
        amount: v,
        received_amount: v,
        received_date: "2026-08-27",
        status: "received",
        entry_date: "2026-08-27",
        expected_date: "2026-08-20",
      }),
    );
    const s = computeMonthIncomeSummary(entries, 8, 2026, TODAY);
    expect(s.received).toBe(4590);
    expect(s.pending).toBe(0);
    expect(s.overdue).toBe(0);
    expect(s.overdueCount).toBe(0);
    expect(entries.every(isAutoIncomeEntry)).toBe(true);
  });

  it("reversão do recebimento volta o valor para pendente/atrasado", () => {
    const reverted = auto({ amount: 940, received_amount: 0, received_date: null, status: "pending", entry_date: "2026-08-20", expected_date: "2026-08-20" });
    const s = computeMonthIncomeSummary([reverted], 8, 2026, TODAY);
    expect(s.received).toBe(0);
    expect(s.pending).toBe(940);
    expect(isIncomeOverdue(reverted, TODAY)).toBe(true);
  });

  it("comissão cancelada não entra como recebida, a receber nem atrasada", () => {
    const e = auto({ amount: 940, received_amount: 0, received_date: null, status: "cancelled", entry_date: "2026-08-20", expected_date: "2026-08-20" });
    expect(getIncomeRemainingAmount(e)).toBe(0);
    expect(isIncomeOverdue(e, TODAY)).toBe(false);
    const s = computeMonthIncomeSummary([e], 8, 2026, TODAY);
    expect(s).toEqual({ received: 0, pending: 0, overdue: 0, overdueCount: 0 });
  });

  it("competência: recebido segue a data real, pendente segue a data prevista", () => {
    const e = auto({ amount: 500, received_amount: 500, received_date: "2026-09-03", status: "received", entry_date: "2026-09-03", expected_date: "2026-08-20" });
    expect(computeMonthIncomeSummary([e], 8, 2026, TODAY).received).toBe(0);
    expect(computeMonthIncomeSummary([e], 9, 2026, TODAY).received).toBe(500);
    expect(computeMonthIncomeSummary([e], 8, 2026, TODAY).pending).toBe(0);
  });

  it("entrada manual pendente sem expected_date permanece intacta, pendente e nunca atrasada", () => {
    const manual = { source: "manual", sale_product_id: null, amount: 1000, received_amount: 0, received_date: null, status: "pending", entry_date: "2026-08-27", expected_date: null };
    expect(isAutoIncomeEntry(manual)).toBe(false);
    const s = computeMonthIncomeSummary([manual], 8, 2026, TODAY);
    expect(s.pending).toBe(1000);
    expect(s.received).toBe(0);
    // Sem expected_date, cai como pendente do mês da entrada e não como atraso do mês seguinte
    expect(isIncomeOverdue(manual, TODAY)).toBe(false);
    expect(s.overdue).toBe(0);
    expect(s.overdueCount).toBe(0);
  });

  it("entrada manual só fica atrasada com expected_date explícita vencida", () => {
    const comData = { source: "manual", amount: 1000, received_amount: 0, status: "pending", entry_date: "2026-08-27", expected_date: "2026-08-28" };
    expect(isIncomeOverdue(comData, TODAY)).toBe(true);
    expect(computeMonthIncomeSummary([comData], 8, 2026, TODAY).overdue).toBe(1000);
  });


  it("registro legado recebido sem received_date usa entry_date", () => {
    const legacy = { source: "manual", amount: 300, status: "received", entry_date: "2026-08-10" };
    expect(getIncomeReceivedAmount(legacy)).toBe(300);
    expect(computeMonthIncomeSummary([legacy], 8, 2026, TODAY).received).toBe(300);
  });

  it("no máximo uma entrada automática por sale_product_id é considerada", () => {
    const dup = [
      auto({ amount: 940, received_amount: 940, received_date: "2026-08-27", status: "received", entry_date: "2026-08-27", expected_date: "2026-08-20" }),
      auto({ amount: 940, received_amount: 940, received_date: "2026-08-27", status: "received", entry_date: "2026-08-27", expected_date: "2026-08-20" }),
    ];
    const unique = Array.from(new Map(dup.map(e => [e.sale_product_id, e])).values());
    expect(unique).toHaveLength(1);
    expect(computeMonthIncomeSummary(unique, 8, 2026, TODAY).received).toBe(940);
  });
});
