import { describe, it, expect } from "vitest";
import {
  computeLandingMetrics,
  conversionRate,
  isTestModeActive,
} from "@/lib/productLandingMetrics";

describe("product landing metrics", () => {
  it("exclui eventos is_test das métricas comerciais", () => {
    const m = computeLandingMetrics(
      [{ is_test: true }, { is_test: true }, { is_test: false }, {}],
      [{ is_test: true }, { is_test: false }]
    );
    expect(m.views).toBe(2);
    expect(m.leads).toBe(1);
    expect(m.testViews).toBe(2);
    expect(m.testLeads).toBe(1);
    expect(m.conversion).toBe(50);
  });

  it("mistura de eventos reais e sintéticos não infla a conversão", () => {
    const only = computeLandingMetrics([{}, {}, {}, {}], [{}]);
    const mixed = computeLandingMetrics(
      [{}, {}, {}, {}, { is_test: true }, { is_test: true }],
      [{}, { is_test: true }]
    );
    expect({ views: mixed.views, leads: mixed.leads, conversion: mixed.conversion }).toEqual({
      views: only.views,
      leads: only.leads,
      conversion: only.conversion,
    });
  });

  it("recalcula indicadores sem eventos válidos", () => {
    const m = computeLandingMetrics([{ is_test: true }], [{ is_test: true }]);
    expect(m).toMatchObject({ views: 0, leads: 0, conversion: 0 });
  });

  it("conversionRate protege divisão por zero", () => {
    expect(conversionRate(0, 0)).toBe("0");
    expect(conversionRate(8, 2)).toBe("25.0");
  });

  it("modo homologação expira automaticamente", () => {
    const now = new Date("2026-07-30T22:00:00Z");
    expect(isTestModeActive(null, now)).toBe(false);
    expect(isTestModeActive("2026-07-30T21:00:00Z", now)).toBe(false);
    expect(isTestModeActive("2026-07-30T23:00:00Z", now)).toBe(true);
  });
});
