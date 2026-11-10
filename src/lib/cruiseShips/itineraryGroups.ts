import type { CruiseSailing, CruiseShipContent } from "./types";

export interface ItineraryVariant { ports: string[]; sailings: CruiseSailing[] }
export interface ItineraryGroup { id: string; n: number; region: string; title: string; variants: ItineraryVariant[] }

/** Sailings eligible for display: publications in conflict are withheld. */
export function eligibleSailings(sailings: CruiseSailing[]): CruiseSailing[] {
  return sailings.filter((s) => s.status !== "conflict");
}

export function regionOf(sailing: CruiseSailing, routes: Pick<CruiseShipContent["routes"], "regionRules" | "fallbackRegion">): string {
  for (const rule of routes.regionRules) if (sailing.ports.some((p) => rule.ports.includes(p))) return rule.region;
  return routes.fallbackRegion;
}

/**
 * Exact port of the approved grouping: key = embark/disembark ports + nights + set of intermediate
 * ports (order-insensitive); each distinct full port order becomes a variant
 * that keeps its own dates. Group title uses the first observed order.
 */
export function buildItineraryGroups(sailings: CruiseSailing[], routes: Pick<CruiseShipContent["routes"], "regionRules" | "fallbackRegion">): ItineraryGroup[] {
  const byGroup = new Map<string, ItineraryGroup>();
  const eligible = eligibleSailings(sailings);
  const multipleOrigins = new Set(eligible.map(s => s.ports[0])).size > 1;
  for (const r of eligible) {
    const key = `${r.title ?? ""}|${r.ports[0]}|${r.ports.at(-1)}|${r.n}|${[...new Set(r.ports.slice(1, -1))].sort().join("|")}`;
    if (!byGroup.has(key)) {
      byGroup.set(key, { id: `route-${byGroup.size}`, n: r.n, region: regionOf(r, routes), title: (r.title ?? r.ports.slice(1, -1).join(" + ")) + (multipleOrigins ? ` · Saída de ${r.ports[0]}` : ""), variants: [] });
    }
    const g = byGroup.get(key)!;
    let v = g.variants.find((x) => x.ports.join("|") === r.ports.join("|"));
    if (!v) { v = { ports: r.ports, sailings: [] }; g.variants.push(v); }
    v.sailings.push(r);
  }
  return [...byGroup.values()];
}

export const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
export const monthLabel = (d: string) =>
  new Date(`${d.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });

export function variantMonths(v: ItineraryVariant): string[] {
  return [...new Set(v.sailings.map((s) => monthLabel(s.date)))];
}

export function groupMonths(g: ItineraryGroup): string[] {
  return [...new Set(g.variants.flatMap((v) => v.sailings).sort((a, b) => a.date.localeCompare(b.date)).map((s) => monthLabel(s.date)))];
}

export const variantCalls = (v: ItineraryVariant) => v.ports.slice(1, -1).join(" → ");
