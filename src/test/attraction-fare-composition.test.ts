import { describe, it, expect } from "vitest";
import {
  applyAgeRule,
  billableQuantity,
  buildDefaultComposition,
  computeAttractionTotal,
  deriveCounts,
  formatCompositionLabel,
  isCustomized,
  needsReview,
  normalizeComposition,
  readCompositionCounts,
  reconcileComposition,
  setPassengerCategory,
  totalQuantity,
  validateAgeRule,
} from "@/lib/attractionFareComposition";

const pax = { adults: 2, children: 2 };

describe("composição padrão", () => {
  it("deriva passageiros do orçamento com rótulos e idades", () => {
    const comp = buildDefaultComposition(pax, [4, 10]);
    expect(comp.passengers.map((p) => p.label)).toEqual(["Adulto 1", "Adulto 2", "Criança 1", "Criança 2"]);
    expect(comp.passengers[2].age).toBe(4);
    expect(comp.counts).toEqual({ adult: 2, child: 2, free: 0 });
    expect(isCustomized(comp)).toBe(false);
  });

  it("ignora valores inválidos de passageiros", () => {
    const comp = buildDefaultComposition({ adults: -3, children: NaN as any });
    expect(comp.passengers).toHaveLength(0);
    expect(formatCompositionLabel(comp.counts)).toBe("Nenhum passageiro");
  });
});

describe("ajuste individual", () => {
  it("marca um passageiro como gratuito e recalcula contagens e total", () => {
    let comp = buildDefaultComposition(pax);
    comp = setPassengerCategory(comp, "child-2", "free");
    expect(comp.counts).toEqual({ adult: 2, child: 1, free: 1 });
    expect(isCustomized(comp)).toBe(true);
    expect(computeAttractionTotal({ counts: comp.counts, adultPrice: 100, childPrice: 50 })).toBe(250);
    expect(billableQuantity(comp.counts)).toBe(3);
    expect(totalQuantity(comp.counts)).toBe(4);
  });

  it("permite cobrar criança como adulto", () => {
    let comp = buildDefaultComposition({ adults: 1, children: 1 });
    comp = setPassengerCategory(comp, "child-1", "adult");
    expect(comp.counts).toEqual({ adult: 2, child: 0, free: 0 });
    expect(formatCompositionLabel(comp.counts)).toBe("2 adultos");
  });
});

describe("regra etária opcional", () => {
  it("valida faixas incoerentes", () => {
    expect(validateAgeRule({ enabled: false })).toBeNull();
    expect(validateAgeRule({ enabled: true })).toMatch(/pelo menos uma faixa/);
    expect(validateAgeRule({ enabled: true, child_min_age: 10, child_max_age: 5 })).toMatch(/mínima/);
    expect(validateAgeRule({ enabled: true, free_max_age: 6, child_min_age: 5 })).toMatch(/gratuidade/);
    expect(validateAgeRule({ enabled: true, free_max_age: 200 })).toMatch(/0 e 120/);
    expect(validateAgeRule({ enabled: true, free_max_age: 2, child_min_age: 3, child_max_age: 11 })).toBeNull();
  });

  it("classifica por idade e mantém quem não tem idade informada", () => {
    let comp = buildDefaultComposition({ adults: 1, children: 3 }, [2, 8, 30]);
    comp = { ...comp, age_rule: { enabled: true, free_max_age: 2, child_min_age: 3, child_max_age: 11 } };
    comp = applyAgeRule(comp);
    expect(comp.counts).toEqual({ adult: 2, child: 1, free: 1 });
    expect(comp.passengers[0].category).toBe("adult"); // adulto sem idade permanece
  });

  it("não altera nada quando a regra está desligada", () => {
    const comp = buildDefaultComposition({ adults: 1, children: 1 }, [1]);
    expect(applyAgeRule(comp)).toEqual(comp);
  });
});

describe("mudança posterior nos passageiros", () => {
  it("detecta dessincronização e reconcilia preservando escolhas", () => {
    let comp = buildDefaultComposition(pax);
    comp = setPassengerCategory(comp, "child-1", "free");
    expect(needsReview(comp, pax)).toBe(false);

    const novoPax = { adults: 3, children: 1 };
    expect(needsReview(comp, novoPax)).toBe(true);

    const reconciled = reconcileComposition(comp, novoPax);
    expect(reconciled.passengers.map((p) => p.label)).toEqual(["Adulto 1", "Adulto 2", "Adulto 3", "Criança 1"]);
    expect(reconciled.passengers[3].category).toBe("free"); // escolha preservada
    expect(reconciled.counts).toEqual({ adult: 3, child: 0, free: 1 });
    expect(needsReview(reconciled, novoPax)).toBe(false);
  });
});

describe("compatibilidade com dados legados", () => {
  it("deriva composição do global quando não há dado salvo", () => {
    const comp = normalizeComposition(undefined, pax);
    expect(comp.counts).toEqual({ adult: 2, child: 2, free: 0 });
  });

  it("normaliza payload parcial/sujo", () => {
    const comp = normalizeComposition(
      { passengers: [{ base: "child", category: "xxx" }, { base: "adult" }], age_rule: { enabled: true, free_max_age: "3" } },
      pax,
    );
    expect(comp.passengers[0].category).toBe("child");
    expect(comp.passengers[1].category).toBe("adult");
    expect(comp.age_rule.free_max_age).toBe(3);
    expect(comp.pax_snapshot).toEqual({ adults: 1, children: 1 });
    expect(deriveCounts(comp.passengers)).toEqual({ adult: 1, child: 1, free: 0 });
  });

  it("leitura pública usa composição ou o cache de quantidades", () => {
    expect(readCompositionCounts({ quantity: 3 })).toBeNull();
    expect(readCompositionCounts({ adult_quantity: 2, child_quantity: 1, free_quantity: 1 })).toEqual({
      adult: 2, child: 1, free: 1,
    });
    const comp = buildDefaultComposition({ adults: 1, children: 0 });
    expect(readCompositionCounts({ fare_composition: comp })).toEqual({ adult: 1, child: 0, free: 0 });
  });
});
