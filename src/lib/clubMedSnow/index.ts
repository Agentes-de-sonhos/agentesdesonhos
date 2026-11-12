/**
 * Catálogo compartilhado "Club Med na neve" (todos os sites de agência).
 * Conteúdo editorial verificado nas páginas oficiais do Club Med (fontes e data
 * em cada item). Dados do Google (nota, avaliações, mapa) vêm do servidor
 * `club-med-snow-places`, deduplicados por Place ID para todos os tenants.
 */
export interface SnowSource { url: string; label: string; accessed: string }
export interface ClubMedSnowResort {
  slug: string;
  kind: "resort" | "chalet";
  relatedTo?: string;
  name: string;
  country: string;
  countryKey: string;
  region?: string;
  village?: string;
  status: "confirmado" | "nao_confirmado";
  statusNote?: string;
  category?: string | null;
  altitude?: string | null;
  skiArea?: { name?: string; km?: number | null; note?: string } | null;
  season?: string | null;
  skiInSkiOut?: boolean | null;
  tagline?: string;
  whyChoose: { title: string; text: string }[];
  highlights: string[];
  location?: string;
  accommodation?: string;
  dining?: string;
  wellness?: string;
  families?: string;
  idealFor?: string[];
  differentiators?: string[];
  snowBenefits?: { included?: string[]; extra?: string[]; notes?: string };
  sources: SnowSource[];
}

const files = import.meta.glob<{ default: ClubMedSnowResort[] }>("./data/*.json", { eager: true });

export const COUNTRY_ORDER = ["franca", "italia", "suica", "canada", "japao", "china"] as const;

export const CLUB_MED_SNOW: ClubMedSnowResort[] = Object.values(files)
  .flatMap((m) => (Array.isArray(m.default) ? m.default : []))
  .filter((r) => r && r.slug && r.name)
  .sort((a, b) => COUNTRY_ORDER.indexOf(a.countryKey as never) - COUNTRY_ORDER.indexOf(b.countryKey as never) || (a.kind === b.kind ? 0 : a.kind === "resort" ? -1 : 1) || a.name.localeCompare(b.name, "pt-BR"));

export function getClubMedSnow(slug: string) {
  return CLUB_MED_SNOW.find((r) => r.slug === slug) ?? null;
}

export function groupByCountry(list = CLUB_MED_SNOW) {
  const map = new Map<string, { country: string; items: ClubMedSnowResort[] }>();
  for (const r of list) {
    if (!map.has(r.countryKey)) map.set(r.countryKey, { country: r.country, items: [] });
    map.get(r.countryKey)!.items.push(r);
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v }));
}

export const CLUB_MED_SNOW_BASE = "/club-med-neve";
