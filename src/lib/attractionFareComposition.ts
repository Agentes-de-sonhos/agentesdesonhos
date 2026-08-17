/**
 * Composição tarifária por ingresso (serviço "Ingressos e Atrações").
 *
 * Cada ingresso pode ter a sua própria distribuição de passageiros entre
 * ADULTO, CRIANÇA e GRATUITO, independente da composição global do orçamento.
 * Tudo é armazenado dentro de `service_data.fare_composition` (jsonb), então
 * orçamentos antigos continuam funcionando sem migração destrutiva.
 *
 * Funções puras — testadas em `src/test/attraction-fare-composition.test.ts`.
 */

export type FareCategory = 'adult' | 'child' | 'free';
export type FareBase = 'adult' | 'child';

export interface FarePassenger {
  id: string;
  /** Base vinda da composição global do orçamento (adulto/criança). */
  base: FareBase;
  /** Rótulo apresentado ao agente ("Adulto 1", "Criança 2"). */
  label: string;
  /** Idade opcional, usada pela regra etária deste ingresso. */
  age?: number | null;
  category: FareCategory;
}

export interface FareAgeRule {
  enabled: boolean;
  /** Idade máxima (inclusive) para ser gratuito. */
  free_max_age?: number | null;
  /** Faixa de criança (inclusive). */
  child_min_age?: number | null;
  child_max_age?: number | null;
}

export interface FareCounts {
  adult: number;
  child: number;
  free: number;
}

export interface PaxSnapshot {
  adults: number;
  children: number;
}

export interface AttractionFareComposition {
  version: 1;
  passengers: FarePassenger[];
  age_rule: FareAgeRule;
  /** Composição global do orçamento no momento da última confirmação. */
  pax_snapshot: PaxSnapshot;
  counts: FareCounts;
}

export const EMPTY_AGE_RULE: FareAgeRule = {
  enabled: false,
  free_max_age: null,
  child_min_age: null,
  child_max_age: null,
};

const CATEGORY_LABEL: Record<FareCategory, [string, string]> = {
  adult: ['adulto', 'adultos'],
  child: ['criança', 'crianças'],
  free: ['gratuito', 'gratuitos'],
};

function plural(n: number, category: FareCategory): string {
  const [one, many] = CATEGORY_LABEL[category];
  return `${n} ${n === 1 ? one : many}`;
}

function makeId(base: FareBase, index: number): string {
  return `${base}-${index + 1}`;
}

function clampCount(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Passageiros padrão derivados da composição global do orçamento. */
export function buildDefaultPassengers(
  pax: PaxSnapshot,
  childrenAges?: (number | null | undefined)[] | null,
): FarePassenger[] {
  const adults = clampCount(pax.adults);
  const children = clampCount(pax.children);
  const out: FarePassenger[] = [];
  for (let i = 0; i < adults; i++) {
    out.push({ id: makeId('adult', i), base: 'adult', label: `Adulto ${i + 1}`, age: null, category: 'adult' });
  }
  for (let i = 0; i < children; i++) {
    const rawAge = childrenAges?.[i];
    const age = Number.isFinite(Number(rawAge)) ? Number(rawAge) : null;
    out.push({ id: makeId('child', i), base: 'child', label: `Criança ${i + 1}`, age, category: 'child' });
  }
  return out;
}

export function deriveCounts(passengers: readonly FarePassenger[]): FareCounts {
  return passengers.reduce<FareCounts>(
    (acc, p) => {
      acc[p.category] += 1;
      return acc;
    },
    { adult: 0, child: 0, free: 0 },
  );
}

export function buildDefaultComposition(
  pax: PaxSnapshot,
  childrenAges?: (number | null | undefined)[] | null,
): AttractionFareComposition {
  const passengers = buildDefaultPassengers(pax, childrenAges);
  return {
    version: 1,
    passengers,
    age_rule: { ...EMPTY_AGE_RULE },
    pax_snapshot: { adults: clampCount(pax.adults), children: clampCount(pax.children) },
    counts: deriveCounts(passengers),
  };
}

/**
 * Normaliza dados persistidos (inclusive legado sem `fare_composition`).
 * Quando não houver composição salva, deriva do global — sem recalcular valores.
 */
export function normalizeComposition(
  raw: unknown,
  pax: PaxSnapshot,
  childrenAges?: (number | null | undefined)[] | null,
): AttractionFareComposition {
  const source = raw as Partial<AttractionFareComposition> | null | undefined;
  const list = Array.isArray(source?.passengers) ? source!.passengers : null;
  if (!list || list.length === 0) return buildDefaultComposition(pax, childrenAges);

  const passengers: FarePassenger[] = list.map((p, i) => {
    const base: FareBase = (p as any)?.base === 'child' ? 'child' : 'adult';
    const category = (['adult', 'child', 'free'] as FareCategory[]).includes((p as any)?.category)
      ? ((p as any).category as FareCategory)
      : base;
    const ageRaw = (p as any)?.age;
    return {
      id: String((p as any)?.id || makeId(base, i)),
      base,
      label: String((p as any)?.label || (base === 'adult' ? `Adulto ${i + 1}` : `Criança ${i + 1}`)),
      age: Number.isFinite(Number(ageRaw)) ? Number(ageRaw) : null,
      category,
    };
  });

  const ruleRaw = (source?.age_rule || {}) as Partial<FareAgeRule>;
  const age_rule: FareAgeRule = {
    enabled: ruleRaw.enabled === true,
    free_max_age: Number.isFinite(Number(ruleRaw.free_max_age)) ? Number(ruleRaw.free_max_age) : null,
    child_min_age: Number.isFinite(Number(ruleRaw.child_min_age)) ? Number(ruleRaw.child_min_age) : null,
    child_max_age: Number.isFinite(Number(ruleRaw.child_max_age)) ? Number(ruleRaw.child_max_age) : null,
  };

  const snapRaw = (source?.pax_snapshot || {}) as Partial<PaxSnapshot>;
  const pax_snapshot: PaxSnapshot = {
    adults: Number.isFinite(Number(snapRaw.adults))
      ? clampCount(snapRaw.adults)
      : passengers.filter((p) => p.base === 'adult').length,
    children: Number.isFinite(Number(snapRaw.children))
      ? clampCount(snapRaw.children)
      : passengers.filter((p) => p.base === 'child').length,
  };

  return { version: 1, passengers, age_rule, pax_snapshot, counts: deriveCounts(passengers) };
}

/** Composição base (adultos/crianças) atualmente registrada no ingresso. */
export function compositionBase(comp: AttractionFareComposition): PaxSnapshot {
  return {
    adults: comp.passengers.filter((p) => p.base === 'adult').length,
    children: comp.passengers.filter((p) => p.base === 'child').length,
  };
}

/** `true` quando a distribuição difere do padrão global (houve ajuste manual). */
export function isCustomized(comp: AttractionFareComposition): boolean {
  const base = compositionBase(comp);
  const counts = comp.counts ?? deriveCounts(comp.passengers);
  return comp.age_rule?.enabled === true || counts.adult !== base.adults || counts.child !== base.children;
}

/**
 * O ingresso ficou dessincronizado da composição global do orçamento
 * (o agente mudou passageiros DEPOIS de personalizar o ingresso).
 */
export function needsReview(comp: AttractionFareComposition, pax: PaxSnapshot): boolean {
  const base = compositionBase(comp);
  return base.adults !== clampCount(pax.adults) || base.children !== clampCount(pax.children);
}

/**
 * Reconciliação determinística com a composição global: mantém as escolhas dos
 * passageiros que continuam existindo, adiciona os novos com a categoria padrão
 * e descarta os excedentes (sempre os últimos de cada base).
 */
export function reconcileComposition(
  comp: AttractionFareComposition,
  pax: PaxSnapshot,
  childrenAges?: (number | null | undefined)[] | null,
): AttractionFareComposition {
  const targetAdults = clampCount(pax.adults);
  const targetChildren = clampCount(pax.children);
  const keep = (base: FareBase, target: number) => {
    const existing = comp.passengers.filter((p) => p.base === base).slice(0, target);
    const out = [...existing];
    for (let i = existing.length; i < target; i++) {
      const rawAge = base === 'child' ? childrenAges?.[i] : null;
      out.push({
        id: makeId(base, i),
        base,
        label: base === 'adult' ? `Adulto ${i + 1}` : `Criança ${i + 1}`,
        age: Number.isFinite(Number(rawAge)) ? Number(rawAge) : null,
        category: base,
      });
    }
    return out.map((p, i) => ({
      ...p,
      label: base === 'adult' ? `Adulto ${i + 1}` : `Criança ${i + 1}`,
    }));
  };

  const passengers = [...keep('adult', targetAdults), ...keep('child', targetChildren)];
  return {
    version: 1,
    passengers,
    age_rule: comp.age_rule ?? { ...EMPTY_AGE_RULE },
    pax_snapshot: { adults: targetAdults, children: targetChildren },
    counts: deriveCounts(passengers),
  };
}

export function setPassengerCategory(
  comp: AttractionFareComposition,
  passengerId: string,
  category: FareCategory,
): AttractionFareComposition {
  const passengers = comp.passengers.map((p) => (p.id === passengerId ? { ...p, category } : p));
  return { ...comp, passengers, counts: deriveCounts(passengers) };
}

export function setPassengerAge(
  comp: AttractionFareComposition,
  passengerId: string,
  age: number | null,
): AttractionFareComposition {
  const passengers = comp.passengers.map((p) => (p.id === passengerId ? { ...p, age } : p));
  return { ...comp, passengers, counts: deriveCounts(passengers) };
}

export function validateAgeRule(rule: FareAgeRule): string | null {
  if (!rule.enabled) return null;
  const values = [rule.free_max_age, rule.child_min_age, rule.child_max_age];
  if (values.every((v) => v === null || v === undefined)) {
    return 'Informe pelo menos uma faixa de idade para usar a regra etária.';
  }
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 120) {
      return 'Idades devem estar entre 0 e 120 anos.';
    }
  }
  const { child_min_age: min, child_max_age: max, free_max_age: free } = rule;
  if (min != null && max != null && Number(min) > Number(max)) {
    return 'A idade mínima de criança não pode ser maior que a máxima.';
  }
  if (free != null && min != null && Number(free) >= Number(min)) {
    return 'A idade máxima de gratuidade deve ser menor que a idade mínima de criança.';
  }
  return null;
}

/** Aplica a regra etária deste ingresso. Passageiros sem idade não mudam. */
export function applyAgeRule(comp: AttractionFareComposition): AttractionFareComposition {
  const rule = comp.age_rule;
  if (!rule?.enabled) return comp;
  const passengers = comp.passengers.map((p) => {
    if (p.age === null || p.age === undefined) return p;
    const age = Number(p.age);
    if (rule.free_max_age != null && age <= Number(rule.free_max_age)) return { ...p, category: 'free' as FareCategory };
    const min = rule.child_min_age;
    const max = rule.child_max_age;
    if (min != null || max != null) {
      const aboveMin = min == null || age >= Number(min);
      const belowMax = max == null || age <= Number(max);
      if (aboveMin && belowMax) return { ...p, category: 'child' as FareCategory };
    }
    return { ...p, category: 'adult' as FareCategory };
  });
  return { ...comp, passengers, counts: deriveCounts(passengers) };
}

export function computeAttractionTotal(input: {
  counts: FareCounts;
  adultPrice: number;
  childPrice: number;
}): number {
  const adult = (Number(input.adultPrice) || 0) * (input.counts.adult || 0);
  const child = (Number(input.childPrice) || 0) * (input.counts.child || 0);
  return adult + child;
}

/** "2 adultos + 1 criança + 1 gratuito" (omite categorias vazias). */
export function formatCompositionLabel(counts: FareCounts): string {
  const parts: string[] = [];
  if (counts.adult > 0) parts.push(plural(counts.adult, 'adult'));
  if (counts.child > 0) parts.push(plural(counts.child, 'child'));
  if (counts.free > 0) parts.push(plural(counts.free, 'free'));
  return parts.length ? parts.join(' + ') : 'Nenhum passageiro';
}

/** Quantidade cobrada (gratuitos não entram). */
export function billableQuantity(counts: FareCounts): number {
  return (counts.adult || 0) + (counts.child || 0);
}

export function totalQuantity(counts: FareCounts): number {
  return billableQuantity(counts) + (counts.free || 0);
}

/** Leitura tolerante para telas públicas/PDF, sem depender do orçamento. */
export function readCompositionCounts(data: any): FareCounts | null {
  const raw = data?.fare_composition;
  if (raw && Array.isArray(raw.passengers) && raw.passengers.length > 0) {
    return deriveCounts(normalizeComposition(raw, { adults: 0, children: 0 }).passengers);
  }
  const adult = clampCount(data?.adult_quantity);
  const child = clampCount(data?.child_quantity);
  const free = clampCount(data?.free_quantity);
  if (adult + child + free > 0) return { adult, child, free };
  return null;
}
