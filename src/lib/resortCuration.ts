import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BrazilResort } from "@/components/resorts-brasil/resortsData";

export interface ResortSetting { resort_slug: string; is_featured: boolean; is_hidden: boolean; display_order: number | null }
export interface ResortCuration { hidden: Set<string>; featured: string[] }

export const EMPTY_CURATION: ResortCuration = { hidden: new Set(), featured: [] };
export const MAX_FEATURED = 6;

export function toCuration(rows: ResortSetting[] | null | undefined): ResortCuration {
  const list = rows ?? [];
  const hidden = new Set(list.filter((r) => r.is_hidden).map((r) => r.resort_slug));
  const featured = list
    .filter((r) => r.is_featured && !r.is_hidden)
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.resort_slug.localeCompare(b.resort_slug))
    .map((r) => r.resort_slug);
  return { hidden, featured };
}

/** Resorts visíveis no site, com os destaques da agência no topo. */
export function applyCuration(all: BrazilResort[], c: ResortCuration): BrazilResort[] {
  const visible = all.filter((r) => !c.hidden.has(r.slug));
  const rank = new Map(c.featured.map((s, i) => [s, i]));
  return [...visible].sort((a, b) => (rank.get(a.slug) ?? 1e6) - (rank.get(b.slug) ?? 1e6));
}

/**
 * Seleção inicial da home: destaques da agência; sem destaques, uma amostra
 * aleatória equilibrada (um resort por região, em rodízio).
 */
export function initialSelection(
  visible: BrazilResort[], c: ResortCuration, regionOf: Record<string, string>,
  max = MAX_FEATURED, rand: () => number = Math.random,
): { resorts: BrazilResort[]; curated: boolean } {
  const bySlug = new Map(visible.map((r) => [r.slug, r]));
  const fav = c.featured.map((s) => bySlug.get(s)).filter(Boolean) as BrazilResort[];
  if (fav.length) return { resorts: fav.slice(0, max), curated: true };
  const groups = new Map<string, BrazilResort[]>();
  visible.forEach((r) => {
    const g = regionOf[r.uf] ?? "x";
    groups.set(g, [...(groups.get(g) ?? []), r]);
  });
  const pools = [...groups.values()].map((g) => [...g].sort(() => rand() - 0.5)).sort(() => rand() - 0.5);
  const out: BrazilResort[] = [];
  for (let i = 0; out.length < max && pools.some((p) => p.length > i); i++)
    for (const p of pools) if (p[i] && out.length < max) out.push(p[i]);
  return { resorts: out, curated: false };
}

export function useAgencyResortCuration(hostname: string | null | undefined) {
  return useQuery({
    queryKey: ["agency-resort-curation", hostname],
    enabled: !!hostname,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_agency_resort_settings", { _hostname: hostname! });
      if (error) return EMPTY_CURATION;
      return toCuration(data as ResortSetting[]);
    },
  });
}
