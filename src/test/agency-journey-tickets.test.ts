import { describe, it, expect } from "vitest";
import { initialServiceValues, serviceByKey } from "@/lib/agencySiteRequests";
import { stepFields } from "@/lib/agencyJourneyFlow";
import { extraOccurrence, inheritedOccurrence, occurrencePlan } from "@/lib/agencyJourneyOccurrences";
import { emptyTripContext } from "@/lib/agencyQuoteJourney";

const ingressos = serviceByKey("ingressos");

/**
 * Regressão do bug "o campo do ingresso desaparece ao digitar": a lista de
 * campos é decidida pelo retrato inicial (baseline), não pelos valores atuais.
 */
describe("ingressos: campo obrigatório não desaparece ao digitar", () => {
  it("mantém o campo na lista depois do primeiro caractere", () => {
    const occurrence = inheritedOccurrence(ingressos, emptyTripContext());
    const before = occurrencePlan(ingressos, occurrence.values, "additional", occurrence.baseline);
    const target = before.fields.find((f) => f.required && f.name !== "observacoes");
    expect(target).toBeTruthy();

    const typed = { ...occurrence.values, [target!.name]: "D" };
    const after = occurrencePlan(ingressos, typed, "additional", occurrence.baseline);
    expect(after.fields.map((f) => f.name)).toContain(target!.name);
    expect(after.fields.map((f) => f.name)).toEqual(before.fields.map((f) => f.name));
  });

  it("o valor digitado permanece na ocorrência e não fica só observações", () => {
    const occurrence = inheritedOccurrence(ingressos, emptyTripContext());
    const plan = occurrencePlan(ingressos, occurrence.values, "additional", occurrence.baseline);
    expect(plan.fields.length).toBeGreaterThan(1);
    const filled = { ...occurrence.values, observacoes: "" };
    const withValue = occurrencePlan(ingressos, filled, "additional", occurrence.baseline);
    expect(withValue.fields.map((f) => f.name)).toContain("observacoes");
  });

  it("ocorrência extra também guarda o retrato inicial", () => {
    const extra = extraOccurrence(ingressos, emptyTripContext());
    expect(extra.baseline).toBeTruthy();
    const names = occurrencePlan(ingressos, { ...extra.values, atracao: "Disney" }, "additional", extra.baseline)
      .fields.map((f) => f.name);
    const baseNames = occurrencePlan(ingressos, extra.values, "additional", extra.baseline).fields.map((f) => f.name);
    expect(names).toEqual(baseNames);
  });

  it("stepFields sem baseline mantém o comportamento antigo", () => {
    const names = stepFields(ingressos, { role: "additional", values: initialServiceValues(ingressos) })
      .map((f) => f.name);
    expect(names).toContain("observacoes");
  });
});
