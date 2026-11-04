import { describe, expect, it } from "vitest";
import { RADAR_PERIODS } from "@/components/campaign/OpportunityRadar";

describe("Radar de Oportunidades — períodos", () => {
  it("inclui dezembro de 2026 e todos os meses de 2027", () => {
    expect(RADAR_PERIODS).toContain("Dezembro de 2026");
    expect(RADAR_PERIODS).toContain("Janeiro de 2027");
    expect(RADAR_PERIODS).toContain("Dezembro de 2027");
    expect(RADAR_PERIODS.filter(p => p.endsWith("2027"))).toHaveLength(12);
  });
});
