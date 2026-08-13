/**
 * Camada compartilhada de identificação segura de hotéis no Google Places.
 *
 * Usada por todos os fluxos de hospedagem (importação por orçamento, arquivo/PDF,
 * texto e edição manual). Nunca substitui silenciosamente o dado importado:
 * apenas classifica a confiança e deixa a decisão final para a agência quando
 * há ambiguidade.
 */

export type MatchConfidence = "high" | "medium" | "low";

export interface HotelQueryContext {
  hotelName: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
}

export interface PlaceCandidate {
  place_id: string;
  name: string;
  formatted_address?: string | null;
  types?: string[];
  rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  photo_url?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface CandidateScore {
  candidate: PlaceCandidate;
  score: number;
  nameScore: number;
  cityMatch: boolean | null;
  countryMatch: boolean | null;
  addressMatch: boolean | null;
  isLodging: boolean;
  /** Conflito explícito de cidade/país — bloqueia autoassociação. */
  hasLocalityConflict: boolean;
}

export interface MatchResult {
  confidence: MatchConfidence;
  /** Preenchido apenas em confiança alta (candidato único e seguro). */
  best: CandidateScore | null;
  ranked: CandidateScore[];
}

/** Sufixos/palavras comerciais que não devem dominar a similaridade do nome. */
const COMMERCIAL_TOKENS = new Set([
  "hotel", "hoteis", "hotels", "resort", "resorts", "pousada", "inn", "hostel",
  "suites", "suite", "apart", "aparthotel", "flat", "spa", "lodge", "palace",
  "plaza", "by", "the", "de", "da", "do", "dos", "das", "e", "and", "of",
  "collection", "boutique", "hospedagem", "residence", "residences", "villas",
]);

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string | null | undefined): string[] {
  const all = normalizeText(value).split(" ").filter(Boolean);
  const core = all.filter((t) => !COMMERCIAL_TOKENS.has(t) && t.length > 1);
  return core.length > 0 ? core : all;
}

function dice(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Map<string, number>();
  b.forEach((t) => setB.set(t, (setB.get(t) || 0) + 1));
  let inter = 0;
  for (const t of a) {
    const n = setB.get(t) || 0;
    if (n > 0) {
      inter += 1;
      setB.set(t, n - 1);
    }
  }
  return (2 * inter) / (a.length + b.length);
}

/** Similaridade 0..1 entre dois nomes de hotel, tolerante a acentos e sufixos. */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const tokenScore = dice(ta, tb);
  const na = ta.join(" ");
  const nb = tb.join(" ");
  const containment = na === nb ? 1 : na.includes(nb) || nb.includes(na) ? 0.9 : 0;
  return Math.max(tokenScore, containment);
}

function localityMatch(expected: string | null | undefined, haystack: string): boolean | null {
  const exp = normalizeText(expected);
  if (!exp) return null;
  const tokens = exp.split(" ").filter((t) => t.length > 2);
  if (tokens.length === 0) return null;
  return tokens.some((t) => haystack.includes(t));
}

/** Monta a consulta textual mais segura possível para o Places. */
export function buildHotelSearchQuery(ctx: HotelQueryContext): string {
  return [ctx.hotelName, ctx.address, ctx.city, ctx.country]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export function scoreCandidate(ctx: HotelQueryContext, candidate: PlaceCandidate): CandidateScore {
  const haystack = normalizeText(
    [candidate.formatted_address, candidate.city, candidate.country].filter(Boolean).join(" "),
  );
  const nameScore = nameSimilarity(ctx.hotelName, candidate.name);
  const cityMatch = localityMatch(ctx.city, haystack);
  const countryMatch = localityMatch(ctx.country, haystack);
  const addressMatch = ctx.address ? localityMatch(ctx.address, haystack) : null;
  const types = candidate.types || [];
  const isLodging = types.includes("lodging") || types.includes("hotel");

  let score = nameScore * 0.6;
  if (cityMatch === true) score += 0.16;
  if (countryMatch === true) score += 0.09;
  if (addressMatch === true) score += 0.07;
  if (isLodging) score += 0.08;
  if (cityMatch === false) score -= 0.3;
  if (countryMatch === false) score -= 0.25;
  if (!isLodging) score -= 0.1;

  return {
    candidate,
    score: Math.max(0, Math.min(1, score)),
    nameScore,
    cityMatch,
    countryMatch,
    addressMatch,
    isLodging,
    hasLocalityConflict: cityMatch === false || countryMatch === false,
  };
}

export const HIGH_CONFIDENCE_SCORE = 0.8;
export const HIGH_CONFIDENCE_NAME = 0.72;
export const MEDIUM_CONFIDENCE_SCORE = 0.5;
/** Margem mínima sobre o segundo colocado para aceitar autoassociação. */
export const HIGH_CONFIDENCE_MARGIN = 0.12;

export function classifyMatches(ctx: HotelQueryContext, candidates: PlaceCandidate[]): MatchResult {
  const ranked = (candidates || [])
    .filter((c) => c?.place_id && c?.name)
    .map((c) => scoreCandidate(ctx, c))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return { confidence: "low", best: null, ranked };

  const [first, second] = ranked;
  const margin = second ? first.score - second.score : 1;
  const isHigh =
    first.score >= HIGH_CONFIDENCE_SCORE &&
    first.nameScore >= HIGH_CONFIDENCE_NAME &&
    first.isLodging &&
    !first.hasLocalityConflict &&
    margin >= HIGH_CONFIDENCE_MARGIN;

  if (isHigh) return { confidence: "high", best: first, ranked };
  if (first.score >= MEDIUM_CONFIDENCE_SCORE) return { confidence: "medium", best: null, ranked };
  return { confidence: "low", best: null, ranked };
}

export const CONFIDENCE_LABEL: Record<MatchConfidence, string> = {
  high: "Confirmado pelo Google",
  medium: "Revisão necessária",
  low: "Hotel não confirmado no Google",
};