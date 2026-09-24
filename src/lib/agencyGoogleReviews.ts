/**
 * Avaliações reais do Google por hostname (configuração administrativa).
 *
 * O navegador envia apenas o hostname; o Place ID efetivamente consultado
 * fica na allowlist da função `google-place-reviews`. O Place ID aqui serve
 * somente para o link de fallback ("Ver no Google") quando a consulta falha.
 */
import { normalizeBrandHost } from "@/lib/agencySiteBrand";

export const GOOGLE_REVIEWS_MAX = 5;

interface GoogleReviewsHostConfig {
  /** Nome buscado no link de fallback do Google Maps. */
  label: string;
  placeId: string;
}

const DESTINOS_COM_A_JU: GoogleReviewsHostConfig = {
  label: "Destinos com a Ju",
  placeId: "ChIJhTnCndr3zpQRyRaMIZaR7Kw",
};

const GOOGLE_REVIEWS_BY_HOSTNAME: Record<string, GoogleReviewsHostConfig> = {
  "destinoscomaju.com.br": DESTINOS_COM_A_JU,
  "www.destinoscomaju.com.br": DESTINOS_COM_A_JU,
};

export function resolveGoogleReviewsConfig(hostname: string | null | undefined) {
  const host = normalizeBrandHost(hostname ?? "");
  return (host && GOOGLE_REVIEWS_BY_HOSTNAME[host]) || null;
}

export function isGoogleReviewsEnabled(hostname: string | null | undefined): boolean {
  return !!resolveGoogleReviewsConfig(hostname);
}

export function googleReviewsFallbackUrl(hostname: string | null | undefined): string | null {
  const cfg = resolveGoogleReviewsConfig(hostname);
  if (!cfg) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.label)}&query_place_id=${cfg.placeId}`;
}

export interface GoogleReview {
  authorName: string;
  authorUrl: string | null;
  photoUrl: string | null;
  rating: number | null;
  text: string | null;
  relativeTime: string | null;
  publishTime: string | null;
  /** Link direto para a avaliação no Google Maps. */
  googleMapsUri: string | null;
  flagContentUri: string | null;
}

export interface GoogleAttribution {
  provider: string;
  providerUri: string | null;
}

export interface GooglePlaceReviews {
  name: string;
  rating: number | null;
  total: number | null;
  url: string | null;
  attributions: GoogleAttribution[];
  reviews: GoogleReview[];
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const httpsUrl = (v: unknown): string | null => {
  const s = str(v);
  return s && /^https:\/\//i.test(s) ? s : null;
};
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

/** Normaliza o payload (Places API New) preservando a ordem de relevância do Google (máx. 5). */
export function mapGooglePlaceReviews(payload: unknown): GooglePlaceReviews | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (p.enabled === false) return null;
  const raw = Array.isArray(p.reviews) ? p.reviews : [];
  const reviews: GoogleReview[] = raw.slice(0, GOOGLE_REVIEWS_MAX).map((r) => {
    const x = obj(r);
    const a = obj(x.authorAttribution);
    const text = typeof x.text === "string" ? x.text : obj(x.text).text;
    return {
      authorName: str(a.displayName) ?? "Usuário do Google",
      authorUrl: httpsUrl(a.uri),
      photoUrl: httpsUrl(a.photoUri),
      rating: num(x.rating),
      text: str(text),
      relativeTime: str(x.relativePublishTimeDescription),
      publishTime: str(x.publishTime),
      googleMapsUri: httpsUrl(x.googleMapsUri),
      flagContentUri: httpsUrl(x.flagContentUri),
    };
  });
  const attributions: GoogleAttribution[] = (Array.isArray(p.attributions) ? p.attributions : [])
    .map((v) => ({ provider: str(obj(v).provider) ?? "", providerUri: httpsUrl(obj(v).providerUri) }))
    .filter((v) => v.provider);
  return {
    name: str(p.displayName) ?? "",
    rating: num(p.rating),
    total: num(p.userRatingCount),
    url: httpsUrl(p.googleMapsUri),
    attributions,
    reviews,
  };
}
