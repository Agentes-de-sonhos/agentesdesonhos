import { describe, it, expect } from "vitest";
import {
  normalizeGroupLimits,
  requiresGroup,
  validateBookingConfig,
  validateServiceSelection,
  groupHint,
} from "@/lib/quoteBookingRules";
import type { QuoteChoiceGroup } from "@/types/quote";

const altGroup: QuoteChoiceGroup = {
  id: "g-alt",
  title: "Hotéis em Orlando",
  group_type: "alternative",
  min_select: 1,
  max_select: 1,
  order_index: 0,
};
const freeGroup: QuoteChoiceGroup = {
  id: "g-free",
  title: "Passeios extras",
  group_type: "free",
  min_select: 0,
  max_select: null,
  order_index: 1,
};

describe("quote booking rules", () => {
  it("optional/required não exigem grupo", () => {
    expect(requiresGroup("optional")).toBe(false);
    expect(requiresGroup("required")).toBe(false);
    expect(validateServiceSelection("optional", null, [])).toBeNull();
  });

  it("alternative/free exigem grupo", () => {
    expect(requiresGroup("alternative")).toBe(true);
    expect(requiresGroup("free")).toBe(true);
    expect(validateServiceSelection("alternative", null, [altGroup])).toMatch(/grupo/i);
  });

  it("rejeita grupo de outro tipo", () => {
    expect(validateServiceSelection("free", "g-alt", [altGroup, freeGroup])).toMatch(/não aceita/i);
    expect(validateServiceSelection("alternative", "g-free", [altGroup, freeGroup])).toMatch(/não aceita/i);
  });

  it("aceita vínculo compatível", () => {
    expect(validateServiceSelection("alternative", "g-alt", [altGroup])).toBeNull();
    expect(validateServiceSelection("free", "g-free", [freeGroup])).toBeNull();
  });

  it("rejeita grupo inexistente (outro orçamento)", () => {
    expect(validateServiceSelection("free", "g-de-outro-quote", [freeGroup])).toMatch(/inválido/i);
  });

  it("alternative é escolha única", () => {
    expect(normalizeGroupLimits("alternative")).toEqual({ min_select: 1, max_select: 1 });
    expect(normalizeGroupLimits("free")).toEqual({ min_select: 0, max_select: null });
    expect(groupHint("alternative")).toContain("1 opção");
    expect(groupHint("free")).toContain("várias");
  });

  it("valida configuração inteira do orçamento", () => {
    const errors = validateBookingConfig(
      [
        { id: "1", option_label: "Hotel A", service_type: "hotel", selection_mode: "alternative", choice_group_id: "g-alt" } as any,
        { id: "2", option_label: "Hotel B", service_type: "hotel", selection_mode: "alternative", choice_group_id: null } as any,
        { id: "3", option_label: "Aéreo", service_type: "flight", selection_mode: "required", choice_group_id: null } as any,
      ],
      [altGroup]
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Hotel B");
  });
});
