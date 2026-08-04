import {
  EMPTY_CAPABILITIES,
  type EligibilityContext,
  type EligibilityResult,
  type RaffleCapabilities,
  type RaffleFilters,
  type RaffleParticipant,
} from "./types";

/** Normaliza texto para comparação (minúsculo, sem acento, sem espaços extras). */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza e-mail apenas para deduplicação — o valor original é preservado na exibição. */
export function normalizeEmail(email: unknown): string {
  const raw = String(email ?? "").trim().toLowerCase();
  if (!raw || !raw.includes("@")) return "";
  const [local, domain] = raw.split("@");
  const cleanLocal = local.split("+")[0].replace(/\s/g, "");
  return `${cleanLocal}@${domain.replace(/\s/g, "")}`;
}

/** Chave canônica de um participante: e-mail normalizado quando existir, senão nome normalizado. */
export function participantKey(p: RaffleParticipant): string {
  return normalizeEmail(p.email) || normalizeText(p.name);
}

export function isCancelled(p: RaffleParticipant): boolean {
  const s = normalizeText(p.registrationStatus);
  return !!s && /cancel|desist|no.?show|reembols/.test(s);
}

export function isConfirmed(p: RaffleParticipant): boolean {
  const s = normalizeText(p.registrationStatus);
  if (s && /confirm|conclu|present|aprovad|check.?in/.test(s)) return true;
  return p.attended === true;
}

export function hasAttended(p: RaffleParticipant): boolean {
  if (typeof p.attended === "boolean") return p.attended;
  if (typeof p.watchedMinutes === "number") return p.watchedMinutes > 0;
  return false;
}

/** Marca duplicidades por e-mail normalizado, preservando a primeira ocorrência. */
export function markDuplicates(participants: RaffleParticipant[]): Set<string> {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const p of participants) {
    const key = normalizeEmail(p.email);
    if (!key) continue;
    if (seen.has(key)) duplicateIds.add(p.id);
    else seen.add(key);
  }
  return duplicateIds;
}

function matchesSearch(p: RaffleParticipant, search: string): boolean {
  const q = normalizeText(search);
  if (!q) return true;
  return [p.name, p.email, p.company, p.city].some((f) => normalizeText(f).includes(q));
}

/**
 * Fonte única de verdade da elegibilidade — usada pela tabela, pelos cards e pelo sorteio.
 */
export function evaluateEligibility(
  participants: RaffleParticipant[],
  filters: RaffleFilters,
  ctx: EligibilityContext = {},
): EligibilityResult[] {
  const caps: RaffleCapabilities = ctx.capabilities ?? EMPTY_CAPABILITIES;
  const duplicateIds = markDuplicates(participants);
  const previous = ctx.previousWinnerKeys ?? new Set<string>();

  return participants.map((participant) => {
    const isDuplicate = duplicateIds.has(participant.id);
    let reason: string | null = null;

    if (!participant.name?.trim()) reason = "Sem nome";
    else if (!matchesSearch(participant, filters.search)) reason = "Fora da busca";
    else if (filters.states.length && !filters.states.includes(participant.state ?? ""))
      reason = "Estado não selecionado";
    else if (filters.cities.length && !filters.cities.includes(participant.city ?? ""))
      reason = "Cidade não selecionada";
    else if (filters.countries.length && !filters.countries.includes(participant.country ?? ""))
      reason = "País não selecionado";
    else if (filters.agencies.length && !filters.agencies.includes(participant.company ?? ""))
      reason = "Agência não selecionada";
    else if (filters.excludeDuplicateEmails && isDuplicate) reason = "E-mail duplicado";
    else if (filters.excludeCancelled && isCancelled(participant)) reason = "Inscrição cancelada";
    else if (filters.onlyConfirmed && !isConfirmed(participant)) reason = "Não confirmado";
    else if (filters.onlyAttended && !hasAttended(participant)) reason = "Sem presença registrada";
    else if (
      filters.minWatchedMinutes !== null &&
      caps.watchedMinutes &&
      (participant.watchedMinutes ?? 0) < filters.minWatchedMinutes
    )
      reason = `Menos de ${filters.minWatchedMinutes} min assistidos`;
    else if (filters.onlySurveyAnswered && caps.survey && participant.surveyAnswered !== true)
      reason = "Não respondeu a pesquisa";
    else if (filters.onlySubscribers && caps.subscribers && participant.isSubscriber !== true)
      reason = "Não é assinante";
    else if (filters.excludePreviousWinners && previous.has(participantKey(participant)))
      reason = "Já foi sorteado";

    return { participant, eligible: reason === null, reason, isDuplicate };
  });
}

export interface RaffleDashboard {
  total: number;
  attended: number;
  confirmed: number;
  eligible: number;
  duplicates: number;
  states: number;
  agencies: number;
  subscribers: number | null;
}

export function computeDashboard(
  results: EligibilityResult[],
  caps: RaffleCapabilities = EMPTY_CAPABILITIES,
): RaffleDashboard {
  const states = new Set<string>();
  const agencies = new Set<string>();
  let attended = 0;
  let confirmed = 0;
  let duplicates = 0;
  let subscribers = 0;

  for (const r of results) {
    const p = r.participant;
    if (p.state) states.add(normalizeText(p.state));
    if (p.company) agencies.add(normalizeText(p.company));
    if (hasAttended(p)) attended++;
    if (isConfirmed(p)) confirmed++;
    if (r.isDuplicate) duplicates++;
    if (p.isSubscriber === true) subscribers++;
  }

  return {
    total: results.length,
    attended,
    confirmed,
    eligible: results.filter((r) => r.eligible).length,
    duplicates,
    states: states.size,
    agencies: agencies.size,
    subscribers: caps.subscribers ? subscribers : null,
  };
}

export interface RaffleStats {
  byState: Array<{ label: string; count: number }>;
  byCity: Array<{ label: string; count: number }>;
  byAgency: Array<{ label: string; count: number }>;
  recurrence: {
    available: boolean;
    firstTime: number;
    twoEvents: number;
    threeEvents: number;
    fourPlus: number;
    fivePlus: number;
    recurring: number;
  };
}

function groupBy(
  participants: RaffleParticipant[],
  pick: (p: RaffleParticipant) => string | null | undefined,
): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const p of participants) {
    const value = (pick(p) ?? "").trim();
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

/**
 * Estatísticas reais. A recorrência usa o identificador canônico (e-mail normalizado)
 * e conta cada participante uma única vez no evento atual.
 */
export function computeStats(participants: RaffleParticipant[]): RaffleStats {
  const uniqueByKey = new Map<string, RaffleParticipant>();
  for (const p of participants) {
    const key = participantKey(p);
    if (key && !uniqueByKey.has(key)) uniqueByKey.set(key, p);
  }
  const unique = [...uniqueByKey.values()];
  const available = unique.some((p) => typeof p.eventsParticipated === "number");

  const counts = unique
    .map((p) => p.eventsParticipated)
    .filter((n): n is number => typeof n === "number");

  return {
    byState: groupBy(participants, (p) => p.state),
    byCity: groupBy(participants, (p) => p.city),
    byAgency: groupBy(participants, (p) => p.company),
    recurrence: {
      available,
      firstTime: counts.filter((n) => n <= 1).length,
      twoEvents: counts.filter((n) => n === 2).length,
      threeEvents: counts.filter((n) => n === 3).length,
      fourPlus: counts.filter((n) => n >= 4).length,
      fivePlus: counts.filter((n) => n >= 5).length,
      recurring: counts.filter((n) => n >= 2).length,
    },
  };
}

export function collectFilterOptions(participants: RaffleParticipant[]) {
  const uniq = (pick: (p: RaffleParticipant) => string | null | undefined) =>
    [...new Set(participants.map((p) => (pick(p) ?? "").trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  return {
    states: uniq((p) => p.state),
    cities: uniq((p) => p.city),
    countries: uniq((p) => p.country),
    agencies: uniq((p) => p.company),
  };
}