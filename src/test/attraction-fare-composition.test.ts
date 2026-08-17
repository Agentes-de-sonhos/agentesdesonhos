import { describe, it, expect } from "vitest";
import {
  applyAgeRule,
  autoSyncDefaultComposition,
  buildAttractionSyncPatch,
  classifyFareSync,
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
  setPassengerAge,
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

describe('regra etária com início adulto', () => {
  it('valida incoerência entre criança e adulto', () => {
    expect(
      validateAgeRule({ enabled: true, free_max_age: 2, child_min_age: 3, child_max_age: 12, adult_min_age: 10 }),
    ).toBeTruthy();
    expect(
      validateAgeRule({ enabled: true, free_max_age: 2, child_min_age: 3, child_max_age: 12, adult_min_age: 13 }),
    ).toBeNull();
  });

  it('classifica como adulto a partir da idade adulta', () => {
    const base = normalizeComposition(undefined, { adults: 1, children: 2 });
    const withAges = setPassengerAge(setPassengerAge(base, base.passengers[1].id, 1), base.passengers[2].id, 15);
    const ruled = applyAgeRule({
      ...withAges,
      age_rule: { enabled: true, free_max_age: 2, child_min_age: 3, child_max_age: 12, adult_min_age: 13 },
    });
    expect(ruled.counts).toEqual({ adult: 2, child: 0, free: 1 });
    expect(ruled.counts.adult + ruled.counts.child + ruled.counts.free).toBe(3);
  });
});

describe('sincronização automática da composição padrão', () => {
  const base = { adults: 2, children: 2 };

  it('padrão persistido 2+2 acompanha viagem 3+1, sem revisão, e recalcula total', () => {
    const persisted = buildDefaultComposition(base);
    const trip = { adults: 3, children: 1 };
    expect(classifyFareSync(persisted, trip)).toBe('default_outdated');
    expect(needsReview(persisted, trip)).toBe(false);

    const synced = autoSyncDefaultComposition(persisted, trip)!;
    expect(synced.counts).toEqual({ adult: 3, child: 1, free: 0 });
    expect(classifyFareSync(synced, trip)).toBe('in_sync');
    expect(computeAttractionTotal({ counts: synced.counts, adultPrice: 100, childPrice: 50 })).toBe(350);
  });

  it('customizado (3 adultos + 1 criança sobre base 2+2) é preservado e exige revisão', () => {
    let comp = buildDefaultComposition(base);
    comp = setPassengerCategory(comp, comp.passengers[2].id, 'adult');
    expect(comp.counts).toEqual({ adult: 3, child: 1, free: 0 });
    const trip = { adults: 3, children: 2 };
    expect(classifyFareSync(comp, trip)).toBe('customized_outdated');
    expect(needsReview(comp, trip)).toBe(true);
    expect(autoSyncDefaultComposition(comp, trip)).toBeNull();
    expect(comp.counts).toEqual({ adult: 3, child: 1, free: 0 });
  });

  it('patch de persistência é idempotente e não duplica', () => {
    const data = {
      fare_composition: buildDefaultComposition(base),
      adult_price: 100,
      child_price: 50,
      adult_quantity: 2,
      child_quantity: 2,
    };
    const trip = { adults: 3, children: 1 };
    const patch = buildAttractionSyncPatch(data, trip)!;
    expect(patch.amount).toBe(350);
    expect(patch.service_data.adult_quantity).toBe(3);
    expect(patch.service_data.child_quantity).toBe(1);
    expect(patch.service_data.free_quantity).toBe(0);
    expect(patch.service_data.billable_quantity).toBe(4);
    expect(patch.service_data.quantity).toBe(4);
    expect(buildAttractionSyncPatch(patch.service_data, trip)).toBeNull();
  });

  it('legado sem fare_composition e serviços não-attraction não são tocados', () => {
    expect(buildAttractionSyncPatch({ price: 900, quantity: 3 }, { adults: 1, children: 0 })).toBeNull();
    expect(buildAttractionSyncPatch({ provider: 'Seguro', price: 300 }, { adults: 4, children: 0 })).toBeNull();
  });

  it('customizado inconsistente bloqueia publicação/PDF; padrão sincronizado não bloqueia', () => {
    const trip = { adults: 3, children: 1 };
    const custom = setPassengerCategory(buildDefaultComposition(base), buildDefaultComposition(base).passengers[2].id, 'free');
    const defaultSynced = buildDefaultComposition(trip);
    const services = [
      { type: 'attraction', comp: custom },
      { type: 'attraction', comp: defaultSynced },
      { type: 'insurance', comp: null },
    ];
    const blocking = services.filter((s) => s.type === 'attraction' && s.comp && needsReview(s.comp, trip));
    expect(blocking).toHaveLength(1);
    expect(needsReview(defaultSynced, trip)).toBe(false);
  });
});

describe('regra etária sem sobreposição', () => {
  it('rejeita faixa infantil aberta junto com início adulto', () => {
    expect(validateAgeRule({ enabled: true, child_min_age: 3, adult_min_age: 12 })).toBeTruthy();
    expect(validateAgeRule({ enabled: true, child_min_age: 3, adult_min_age: 2 })).toBeTruthy();
  });

  it('aceita regras parciais coerentes', () => {
    expect(validateAgeRule({ enabled: true, free_max_age: 2 })).toBeNull();
    expect(validateAgeRule({ enabled: true, adult_min_age: 12 })).toBeNull();
    expect(validateAgeRule({ enabled: true, free_max_age: 2, adult_min_age: 12 })).toBeNull();
    expect(validateAgeRule({ enabled: true, free_max_age: 2, child_min_age: 3, child_max_age: 11, adult_min_age: 12 })).toBeNull();
  });
});

describe('detecção de personalização por passageiro (swap com contagem igual)', () => {
  const base = { adults: 2, children: 2 };

  it('swap Adulto↔Criança mantém 2+2 mas é personalizado e nunca auto-sincroniza', () => {
    let comp = buildDefaultComposition(base);
    comp = setPassengerCategory(comp, 'adult-1', 'child');
    comp = setPassengerCategory(comp, 'child-1', 'adult');
    // contagens agregadas idênticas ao padrão
    expect(comp.counts).toEqual({ adult: 2, child: 2, free: 0 });
    expect(comp.age_rule.enabled).toBe(false);
    expect(isCustomized(comp)).toBe(true);

    const trip = { adults: 3, children: 1 };
    expect(classifyFareSync(comp, trip)).toBe('customized_outdated');
    expect(autoSyncDefaultComposition(comp, trip)).toBeNull();
    expect(needsReview(comp, trip)).toBe(true);
    expect(buildAttractionSyncPatch({ fare_composition: comp, adult_price: 100, child_price: 50 }, trip)).toBeNull();
    // escolhas individuais preservadas
    expect(comp.passengers.map((p) => p.category)).toEqual(['child', 'adult', 'adult', 'child']);
  });

  it('composição realmente padrão (counts derivados) continua auto-sincronizando', () => {
    const comp = buildDefaultComposition(base);
    expect(comp.passengers.every((p) => p.category === p.base)).toBe(true);
    expect(isCustomized(comp)).toBe(false);
    const trip = { adults: 3, children: 1 };
    expect(classifyFareSync(comp, trip)).toBe('default_outdated');
    expect(autoSyncDefaultComposition(comp, trip)?.counts).toEqual({ adult: 3, child: 1, free: 0 });
    expect(needsReview(comp, trip)).toBe(false);
  });

  it('normalização preserva o mapeamento individual do swap', () => {
    let comp = buildDefaultComposition(base);
    comp = setPassengerCategory(comp, 'adult-1', 'child');
    comp = setPassengerCategory(comp, 'child-1', 'adult');
    const round = normalizeComposition(JSON.parse(JSON.stringify(comp)), base);
    expect(isCustomized(round)).toBe(true);
    expect(round.counts).toEqual({ adult: 2, child: 2, free: 0 });
  });
});
