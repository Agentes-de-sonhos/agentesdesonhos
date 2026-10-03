import { BRAZIL_RESORTS } from "@/components/resorts-brasil/resortsData";
import { NANNAI_MURO_ALTO } from "./nannaiFixture";
import googleData from "./resortsGoogleData.json";
import type { HotelPageData } from "./types";

/**
 * Catálogo único das páginas de resort (mesmo layout do Nannai para todos).
 * Fotos, avaliações e localização foram importadas UMA vez do Google em
 * 03/10/2026 e ficam salvas no projeto — abrir a página não consulta o Google.
 * Textos ("Por que escolher" e "Destaques") entram em `RESORT_TEXTS` depois.
 */
interface GoogleSnapshot {
  placeName: string; address: string; city: string;
  rating: number | null; total: number | null; mapsUrl: string;
  lat: number; lng: number;
  photos: { url: string; credit: string }[];
  reviews: { author: string; rating?: number; text: string; relativeTime?: string }[];
}

const STATE_NAME: Record<string, string> = {
  SP: "São Paulo", RJ: "Rio de Janeiro", MG: "Minas Gerais", ES: "Espírito Santo", PR: "Paraná",
  RS: "Rio Grande do Sul", SC: "Santa Catarina", AM: "Amazonas", BA: "Bahia", AL: "Alagoas",
  PE: "Pernambuco", RN: "Rio Grande do Norte", CE: "Ceará", GO: "Goiás", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
};

/** Textos curados por resort (a receber). Chave = slug. */
export const RESORT_TEXTS: Partial<Record<string, Partial<Pick<HotelPageData, "descriptionTitle" | "description" | "amenities" | "checkIn" | "checkOut">>>> = {};

const DATA = googleData as Record<string, GoogleSnapshot>;

export function getResortPage(slug: string): HotelPageData | null {
  if (slug === NANNAI_MURO_ALTO.slug) return NANNAI_MURO_ALTO;
  const base = BRAZIL_RESORTS.find((r) => r.slug === slug);
  const g = DATA[slug];
  if (!base || !g) return null;
  const texts: NonNullable<(typeof RESORT_TEXTS)[string]> = RESORT_TEXTS[slug] ?? {};
  return {
    slug,
    name: g.placeName,
    address: g.address,
    city: g.city,
    state: STATE_NAME[base.uf] ?? base.uf,
    photos: g.photos.map((p) => ({ url: p.url, alt: g.placeName })),
    description: texts.description ?? [],
    descriptionTitle: texts.descriptionTitle ?? `Por que escolher o ${g.placeName}?`,
    amenities: texts.amenities ?? [],
    checkIn: texts.checkIn,
    checkOut: texts.checkOut,
    google: g.rating
      ? { rating: g.rating, totalReviews: g.total ?? 0, reviewsUrl: g.mapsUrl, reviews: [...g.reviews].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5) }
      : undefined,
    location: { lat: g.lat, lng: g.lng, mapsUrl: g.mapsUrl },
  };
}
