import { describe, it, expect } from "vitest";
import { saleFinancialGap, commissionInMonth } from "@/lib/saleFinancialStatus";

describe("venda → Entradas/Comissões", () => {
  it("venda sem serviços é sinalizada e não inventa comissão", () => {
    expect(saleFinancialGap(0, 0)).toBe("no_products");
  });
  it("serviço com comissão zero é sinalizado", () => {
    expect(saleFinancialGap(1, 0)).toBe("zero_commission");
  });
  it("serviço com comissão positiva não tem pendência", () => {
    expect(saleFinancialGap(2, 214.35)).toBeNull();
  });
});

describe("filtro de mês da aba Comissões", () => {
  it("sem data prevista/recebida usa a data da venda", () => {
    const c = { expected_date: null, received_date: null, sale_date: "2026-10-13" };
    expect(commissionInMonth(c, 10, 2026)).toBe(true);
    expect(commissionInMonth(c, 11, 2026)).toBe(false);
  });
  it("com data prevista segue a data prevista, não a da venda", () => {
    const c = { expected_date: "2026-11-08", received_date: null, sale_date: "2026-10-09" };
    expect(commissionInMonth(c, 11, 2026)).toBe(true);
    expect(commissionInMonth(c, 10, 2026)).toBe(false);
  });
  it("recebida aparece no mês do recebimento", () => {
    const c = { expected_date: "2026-10-29", received_date: "2026-11-02", sale_date: "2026-10-14" };
    expect(commissionInMonth(c, 11, 2026)).toBe(true);
  });
  it("tudo nulo não aparece em nenhum mês", () => {
    expect(commissionInMonth({ expected_date: null, received_date: null, sale_date: null }, 10, 2026)).toBe(false);
  });
});

describe("regressões", () => {
  it("comissão zero sem datas continua visível no mês da venda", () => {
    const c = { commission_amount: 0, expected_date: null, received_date: null, sale_date: "2026-10-13" };
    expect(commissionInMonth(c, 10, 2026)).toBe(true);
  });
  it("comissão futura fica fora do mês corrente", () => {
    const c = { expected_date: "2027-01-15", received_date: null, sale_date: "2026-10-14" };
    expect(commissionInMonth(c, 10, 2026)).toBe(false);
    expect(commissionInMonth(c, 1, 2027)).toBe(true);
  });
  it("aviso de comissão zero é informativo e não pede comissão positiva", async () => {
    const { SALE_GAP_MESSAGE } = await import("@/lib/saleFinancialStatus");
    expect(SALE_GAP_MESSAGE.zero_commission).toMatch(/aparecem em Comissões/);
    expect(SALE_GAP_MESSAGE.zero_commission).not.toMatch(/informe|adicione/i);
    expect(SALE_GAP_MESSAGE.no_products).not.toMatch(/informe|adicione/i);
  });
});
