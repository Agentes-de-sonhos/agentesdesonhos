/**
 * Regras puras e testáveis da busca de fotos.
 *
 * Diferencia buscas de DESTINO (galeria de apresentação: fotos genéricas de
 * cidade/região) de buscas de LOCAL ESPECÍFICO (hotel, atração, restaurante,
 * aeroporto, atividade) — que continuam priorizando o Google Places.
 */

export type PhotoPurpose = "destination" | "place";

export const MAX_PHOTOS = 5;

/** Dias de validade do cache de galeria de destinos no servidor. */
export const GALLERY_CACHE_TTL_DAYS = 7;

export type PhotoSource = "pexels" | "unsplash" | "google_places";

export interface PhotoCandidate {
  photo_url: string;
  thumb_url: string;
  source: string;
  attributions?: string[];
}

export function normalizePurpose(value: unknown): PhotoPurpose {
  return value === "destination" ? "destination" : "place";
}

export function normalizeText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Consulta enviada aos provedores.
 * - LOCAL ESPECÍFICO: mantém o comportamento histórico (query + local + destino),
 *   pois o contexto ajuda o Google a achar o lugar certo.
 * - DESTINO: o texto digitado é a consulta principal. O destino original do
 *   orçamento só é somado quando é exatamente o mesmo texto pesquisado, então
 *   buscar "Campinas" num orçamento de "Punta Cana" nunca recebe "Punta Cana".
 */
export function buildQueryText(
  purpose: PhotoPurpose,
  input: { query: string; destination?: string | null; location?: string | null },
): string {
  const query = String(input.query || "").trim();
  if (purpose === "destination") return query;
  const parts = [query, input.location, input.destination]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(" ");
}

/** Ordem das fontes: destino economiza o Google, deixando-o como fallback. */
export function sourceOrder(purpose: PhotoPurpose): PhotoSource[] {
  return purpose === "destination"
    ? ["pexels", "unsplash", "google_places"]
    : ["google_places", "unsplash", "pexels"];
}

/** Chave de cache: sempre consulta normalizada + contexto relevante. */
export function galleryCacheKey(
  purpose: PhotoPurpose,
  input: { query: string; destination?: string | null; location?: string | null },
): string {
  const context = purpose === "destination"
    ? ""
    : [input.location, input.destination].map((v) => normalizeText(String(v || ""))).filter(Boolean).join("|");
  return `gallery:${purpose}:${normalizeText(buildQueryText(purpose, input))}${context ? `|${context}` : ""}`
    .slice(0, 220);
}

export function isCacheFresh(updatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!updatedAt) return false;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return false;
  return now - ts < GALLERY_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Roda as fontes na ordem informada, parando assim que a quantidade pedida for
 * preenchida. Falha/limite/ausência de uma fonte é ignorada silenciosamente.
 */
export async function collectPhotos(
  order: PhotoSource[],
  fetchers: Partial<Record<PhotoSource, (want: number) => Promise<PhotoCandidate[]>>>,
  want: number,
): Promise<PhotoCandidate[]> {
  const limit = Math.min(Math.max(Number(want) || 1, 1), MAX_PHOTOS);
  const out: PhotoCandidate[] = [];
  const seen = new Set<string>();
  for (const source of order) {
    if (out.length >= limit) break;
    const fetcher = fetchers[source];
    if (!fetcher) continue;
    try {
      const found = await fetcher(limit - out.length);
      for (const photo of found || []) {
        if (!photo?.photo_url || seen.has(photo.photo_url)) continue;
        seen.add(photo.photo_url);
        out.push(photo);
        if (out.length >= limit) break;
      }
    } catch (e) {
      console.warn(`[activity-photo] fonte ${source} falhou`, (e as Error)?.message ?? e);
    }
  }
  return out.slice(0, limit);
}
