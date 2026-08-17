import { describe, expect, it } from "vitest";
import {
  computeQuoteTotalState,
  hidesIndividualAmounts,
  isServiceAmountMissing,
  getInvestmentPresentationLayout,
} from "@/lib/quotePricing";

const services = [{ amount: 10000 }, { amount: 8450 }];

describe("bloco Valor total do orçamento", () => {
  it("calcula automaticamente a soma dos serviços sem escolha prévia", () => {
    const s = computeQuoteTotalState({ pricing_mode: null }, services);
    expect(s.manual).toBe(false);
    expect(s.total).toBe(18450);
    expect(s.servicesWithoutValue).toBe(0);
  });

  it("usa o valor manual sem alterar os valores dos serviços", () => {
    const s = computeQuoteTotalState(
      { pricing_mode: "package", package_total_amount: 17900 },
      services,
    );
    expect(s.manual).toBe(true);
    expect(s.total).toBe(17900);
    expect(s.servicesSum).toBe(18450);
  });

  it("volta ao automático ao usar a soma dos serviços", () => {
    const s = computeQuoteTotalState({ pricing_mode: "itemized", package_total_amount: 17900 }, services);
    expect(s.manual).toBe(false);
    expect(s.total).toBe(18450);
  });

  it("detecta ausência total de valores para pedir o valor fechado", () => {
    const s = computeQuoteTotalState({}, [{ amount: null }, { amount: undefined }]);
    expect(s.hasAnyServiceValue).toBe(false);
    expect(s.servicesWithoutValue).toBe(2);
  });

  it("alerta serviços sem valor mas não trata zero intencional como erro", () => {
    const s = computeQuoteTotalState({}, [{ amount: 12500 }, { amount: null }, { amount: 0 }]);
    expect(s.total).toBe(12500);
    expect(s.servicesWithoutValue).toBe(1);
    expect(isServiceAmountMissing({ amount: 0 })).toBe(false);
  });

  it("valor manual esconde valores individuais só no consolidado", () => {
    const base = { pricing_mode: "package", package_total_amount: 100 };
    expect(hidesIndividualAmounts({ ...base, investment_summary_layout: "consolidated" })).toBe(true);
    expect(hidesIndividualAmounts({ ...base, investment_summary_layout: "ungrouped" })).toBe(false);
    expect(hidesIndividualAmounts({ ...base, investment_summary_layout: "grouped" })).toBe(false);
    expect(hidesIndividualAmounts({ ...base })).toBe(true); // legacy preservado
    expect(hidesIndividualAmounts({ investment_summary_layout: "consolidated" })).toBe(false);
  });

  it("normaliza o layout de orçamentos antigos", () => {
    expect(getInvestmentPresentationLayout({})).toBe("legacy");
    expect(getInvestmentPresentationLayout({ investment_summary_layout: "grouped" })).toBe("grouped");
  });
});