import { describe, it, expect } from "vitest";
import { normalizeWhatsappDigits } from "@/hooks/usePublicProductLanding";
import { safeUuid } from "@/lib/safeUuid";

describe("normalizeWhatsappDigits", () => {
  it("adds the Brazilian country code to local mobile numbers", () => {
    expect(normalizeWhatsappDigits("(35) 99954-0212")).toBe("5535999540212");
  });
  it("adds the country code to landlines (10 digits)", () => {
    expect(normalizeWhatsappDigits("35 3421-0212")).toBe("553534210212");
  });
  it("keeps numbers that already carry the country code", () => {
    expect(normalizeWhatsappDigits("+55 35 99954-0212")).toBe("5535999540212");
  });
  it("returns empty string for missing numbers", () => {
    expect(normalizeWhatsappDigits(null)).toBe("");
    expect(normalizeWhatsappDigits("abc")).toBe("");
  });
});

describe("safeUuid", () => {
  it("produces unique v4-shaped identifiers", () => {
    const a = safeUuid();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(safeUuid());
  });
});