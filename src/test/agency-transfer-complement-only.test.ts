import { describe, it, expect } from "vitest";
import { PRIMARY_REQUEST_SERVICES } from "@/lib/agencySiteRequests";
import { eligibleComplements } from "@/lib/agencyQuoteJourney";

describe("transfer só como serviço adicional", () => {
  it("não aparece na seleção principal", () => {
    expect(PRIMARY_REQUEST_SERVICES.map((s) => s.key)).not.toContain("transfer");
  });
  it("aparece ao adicionar mais um serviço", () => {
    expect(eligibleComplements(["aereo"]).map((s) => s.key)).toContain("transfer");
  });
});
