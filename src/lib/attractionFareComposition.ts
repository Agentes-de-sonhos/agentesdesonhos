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
  /** Idade máxima (inclusive) para ser gratuito/isento. */
  free_max_age?: number | null;
  /** Faixa de criança (inclusive). */
  child_min_age?: number | null;
  child_max_age?: number | null;
  /** Idade a partir da qual o passageiro é cobrado como adulto. */
  adult_min_age?: number | null;
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
  adult_min_age: null,
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

  const passengers: FarePassenger[] = list.map((raw, i) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    const base: FareBase = p.base === 'child' ? 'child' : 'adult';
    const category = (['adult', 'child', 'free'] as FareCategory[]).includes(p.category as FareCategory)
      ? (p.category as FareCategory)
      : base;
    const ageRaw = p.age;
    return {
      id: String(p.id || makeId(base, i)),
      base,
      label: String(p.label || (base === 'adult' ? `Adulto ${i + 1}` : `Criança ${i + 1}`)),
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
    adult_min_age: Number.isFinite(Number(ruleRaw.adult_min_age)) ? Number(ruleRaw.adult_min_age) : null,
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

/**
 * `true` quando a distribuição difere do padrão global (houve ajuste manual).
 *
 * A comparação é feita PASSAGEIRO A PASSAGEIRO (category !== base), e não por
 * contagens agregadas: trocar "Adulto 1 → Criança" e "Criança 1 → Adulto"
 * mantém os totais idênticos, mas é uma configuração manual real que nunca
 * pode ser auto-sincronizada/apagada. A semântica da regra etária é
 * preservada: `age_rule.enabled` sempre marca a composição como personalizada.
 */
export function isCustomized(comp: AttractionFareComposition): boolean {
  if (comp.age_rule?.enabled === true) return true;
  if (comp.passengers.some((p) => p.category !== p.base)) return true;
  // Rede de segurança para dados legados/inconsistentes onde `counts` salvo
  // não corresponde ao mapeamento individual.
  const base = compositionBase(comp);
  const counts = comp.counts ?? deriveCounts(comp.passengers);
  return counts.adult !== base.adults || counts.child !== base.children;
}

/**
 * O ingresso está fora de sincronia com a composição global do orçamento
 * (a base registrada difere dos passageiros atuais). Isso NÃO significa,
 * por si só, que exista revisão manual pendente — ver `classifyFareSync`.
 */
export function isOutOfSync(comp: AttractionFareComposition, pax: PaxSnapshot): boolean {
  const base = compositionBase(comp);
  return base.adults !== clampCount(pax.adults) || base.children !== clampCount(pax.children);
}

export type FareSyncStatus = 'in_sync' | 'default_outdated' | 'customized_outdated';

/**
 * Decisão explícita e testável:
 * - `in_sync`: nada a fazer;
 * - `default_outdated`: composição padrão (não personalizada) desatualizada →
 *   deve acompanhar automaticamente os passageiros da viagem, sem bloquear;
 * - `customized_outdated`: composição realmente personalizada desatualizada →
 *   preserva as escolhas, sinaliza e bloqueia até revisão do agente.
 */
export function classifyFareSync(comp: AttractionFareComposition, pax: PaxSnapshot): FareSyncStatus {
  if (!isOutOfSync(comp, pax)) return 'in_sync';
  return isCustomized(comp) ? 'customized_outdated' : 'default_outdated';
}

/** Somente composições PERSONALIZADAS desatualizadas exigem revisão manual. */
export function needsReview(comp: AttractionFareComposition, pax: PaxSnapshot): boolean {
  return classifyFareSync(comp, pax) === 'customized_outdated';
}

/**
 * Retorna a composição padrão já sincronizada quando (e somente quando) o
 * ingresso usa composição padrão desatualizada. Nos outros casos devolve
 * `null` — chamada idempotente, segura para efeitos/persistência.
 */
export function autoSyncDefaultComposition(
  comp: AttractionFareComposition,
  pax: PaxSnapshot,
  childrenAges?: (number | null | undefined)[] | null,
): AttractionFareComposition | null {
  if (classifyFareSync(comp, pax) !== 'default_outdated') return null;
  return buildDefaultComposition(pax, childrenAges);
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
  const values = [rule.free_max_age, rule.child_min_age, rule.child_max_age, rule.adult_min_age];
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
  const adult = rule.adult_min_age;
  if (adult != null) {
    if (free != null && Number(adult) <= Number(free)) {
      return 'O início da idade adulta deve ser maior que a idade máxima de gratuidade.';
    }
    if (max != null && Number(adult) <= Number(max)) {
      return 'O início da idade adulta deve ser maior que a idade máxima infantil.';
    }
    // Faixa infantil aberta no topo alcançaria a idade adulta: ambíguo.
    if (max == null && min != null && Number(adult) > Number(min)) {
      return 'Informe a idade máxima infantil para não sobrepor o início da idade adulta.';
    }
    if (max == null && min != null && Number(adult) <= Number(min)) {
      return 'O início da idade adulta deve ser maior que a idade mínima de criança.';
    }
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
    if (rule.adult_min_age != null && age >= Number(rule.adult_min_age)) return { ...p, category: 'adult' as FareCategory };
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

/**
 * Patch idempotente para persistir a sincronização automática de um ingresso
 * com composição PADRÃO desatualizada. Retorna `null` quando não há nada a
 * fazer (em sincronia, personalizado ou legado sem `fare_composition`).
 */
export function buildAttractionSyncPatch(
  data: unknown,
  pax: PaxSnapshot,
  childrenAges?: (number | null | undefined)[] | null,
): { service_data: Record<string, unknown>; amount: number } | null {
  const record = (data ?? {}) as Record<string, unknown>;
  // Legado sem composição persistida: preserva valores até o agente editar.
  if (!record.fare_composition) return null;
  const current = normalizeComposition(record.fare_composition, pax, childrenAges);
  const synced = autoSyncDefaultComposition(current, pax, childrenAges);
  if (!synced) return null;

  const counts = synced.counts;
  const adultPrice = Number(record.adult_price) || 0;
  const childPrice = Number(record.child_price) || 0;
  const amount = computeAttractionTotal({ counts, adultPrice, childPrice });

  return {
    service_data: {
      ...record,
      fare_composition: synced,
      adult_quantity: counts.adult,
      child_quantity: counts.child,
      free_quantity: counts.free,
      billable_quantity: billableQuantity(counts),
      quantity: totalQuantity(counts),
      price: amount,
    },
    amount,
  };
}

/** Leitura tolerante para telas públicas/PDF, sem depender do orçamento. */
export function readCompositionCounts(data: unknown): FareCounts | null {
  const record = (data ?? {}) as Record<string, unknown>;
  const raw = record.fare_composition as { passengers?: unknown } | undefined;
  if (raw && Array.isArray(raw.passengers) && raw.passengers.length > 0) {
    return deriveCounts(normalizeComposition(raw, { adults: 0, children: 0 }).passengers);
  }
  const adult = clampCount(record.adult_quantity);
  const child = clampCount(record.child_quantity);
  const free = clampCount(record.free_quantity);
  if (adult + child + free > 0) return { adult, child, free };
  return null;
}
