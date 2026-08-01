import { describe, it, expect } from "vitest";
import {
  buildLeadSummary,
  buildLeadWhatsappMessage,
  buildSteps,
  officeHoursOf,
  timezoneOf,
  validateStep,
} from "@/lib/leadFormConfig";
import { DEFAULT_OFFICE_HOURS } from "@/lib/officeHours";

describe("leadFormConfig", () => {
  it("always asks for name and phone", () => {
    const keys = buildSteps({}).map((s) => s.key);
    expect(keys[0]).toBe("name");
    expect(keys[1]).toBe("phone");
  });

  it("removes disabled questions", () => {
    const keys = buildSteps({
      ask_email: false,
      ask_dates: false,
      ask_travelers: false,
      ask_budget: false,
    }).map((s) => s.key);
    expect(keys).toEqual(["name", "phone", "destination", "additional_info"]);
  });

  it("marks e-mail as required when configured", () => {
    const email = buildSteps({ ask_email: true, require_email: true }).find((s) => s.key === "email");
    expect(email?.optional).toBe(false);
  });

  it("validates name, phone and e-mail", () => {
    expect(validateStep("name", "A")).toBeTruthy();
    expect(validateStep("name", "Ana Souza")).toBeNull();
    expect(validateStep("phone", "1199")).toBeTruthy();
    expect(validateStep("phone", "(11) 99999-9999")).toBeNull();
    expect(validateStep("email", "")).toBeNull();
    expect(validateStep("email", "", true)).toBeTruthy();
    expect(validateStep("email", "nao-email", true)).toBeTruthy();
    expect(validateStep("email", "ana@teste.com", true)).toBeNull();
  });

  it("falls back to defaults for empty office hours", () => {
    expect(officeHoursOf(null)).toEqual(DEFAULT_OFFICE_HOURS);
    expect(officeHoursOf({ mon: [], tue: [] })).toEqual(DEFAULT_OFFICE_HOURS);
    expect(officeHoursOf({ mon: [["09:00", "12:00"]] }).mon).toEqual([["09:00", "12:00"]]);
    expect(timezoneOf("")).toBe("America/Sao_Paulo");
    expect(timezoneOf("Europe/Lisbon")).toBe("Europe/Lisbon");
  });

  it("builds a deterministic summary without AI", () => {
    const summary = buildLeadSummary({
      name: "Ana Souza",
      destination: "Orlando",
      travel_dates: "julho de 2026",
      travelers_count: "2 adultos",
    });
    expect(summary).toContain("Ana Souza pediu contato sobre Orlando");
    expect(summary).toContain("período: julho de 2026");
    expect(summary).toContain("viajantes: 2 adultos");
  });

  it("never leaves an empty summary", () => {
    expect(buildLeadSummary({})).toBe("Novo contato recebido.");
  });

  it("builds a WhatsApp message with only the answered fields", () => {
    const msg = buildLeadWhatsappMessage({ name: "Ana", destination: "Lisboa" }, "Travel.IN");
    expect(msg).toContain("Olá Travel.IN!");
    expect(msg).toContain("Nome: Ana");
    expect(msg).toContain("Destino: Lisboa");
    expect(msg).not.toContain("Orçamento:");
  });
});
