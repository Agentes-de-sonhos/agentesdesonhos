import { describe, expect, it } from "vitest";
import { isUniversalLandingEnabled, isJuUniversalProfile } from "@/lib/universalLandingAccess";

describe("IMM Universal opt-in isolation", () => {
  it.each(["immturismo.com.br", "www.immturismo.com.br"])("enables the shared Universal page for %s", (hostname) => {
    expect(isUniversalLandingEnabled(hostname)).toBe(true);
    expect(isJuUniversalProfile(hostname)).toBe(false);
  });
  it("does not enable Universal for Shopping or a lookalike IMM host", () => {
    expect(isUniversalLandingEnabled("shoppingviagens.com.br")).toBe(false);
    expect(isUniversalLandingEnabled("immturismo.com.br.example.org")).toBe(false);
  });
});