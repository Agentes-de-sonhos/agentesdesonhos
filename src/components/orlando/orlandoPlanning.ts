import { ORLANDO_CATALOG, type OrlandoExperience } from "./orlandoCatalog";

const byId = new Map(ORLANDO_CATALOG.map((e) => [e.id, e]));
export const getExperience = (id: string): OrlandoExperience | undefined => byId.get(id);

export const isThemeOf = (id: string, group: string) => {
  const e = byId.get(id);
  return !!e && e.category === "theme_park" && e.group === group;
};

/** Mínimo de dias Disney = parques temáticos Disney selecionados. */
export const disneyMin = (selected: string[]) => selected.filter((id) => isThemeOf(id, "disney")).length;
export const universalMin = (selected: string[]) => selected.filter((id) => isThemeOf(id, "universal")).length;

export interface OrlandoEstimate { dayUnits: number; eveningExperiences: number }

/**
 * Estimativa editorial (não regra de ingresso):
 * dias Disney + dias Universal + 1 por outro item de dia inteiro + 0,5 se houver
 * qualquer atração do ICON Park; shows/esportes/eventos contam como noites.
 */
export function estimate(selected: string[], disneyDays: number, universalDays: number): OrlandoEstimate {
  let other = 0;
  let icon = false;
  let evening = 0;
  for (const id of selected) {
    const e = byId.get(id);
    if (!e) continue;
    if (e.category === "theme_park" && (e.group === "disney" || e.group === "universal")) continue;
    if (e.category === "short_attraction") { icon = true; continue; }
    if (e.category === "show" || e.category === "sport" || e.category === "special_event") { evening++; continue; }
    other++;
  }
  const dDays = disneyMin(selected) ? disneyDays : 0;
  const uDays = universalMin(selected) ? universalDays : 0;
  return { dayUnits: dDays + uDays + other + (icon ? 0.5 : 0), eveningExperiences: evening };
}

export function tripCalendarDays(arrival: string, departure: string): number | null {
  if (!arrival || !departure) return null;
  const [ay, am, ad] = arrival.split("-").map(Number);
  const [dy, dm, dd] = departure.split("-").map(Number);
  const a = new Date(ay, am - 1, ad).getTime();
  const b = new Date(dy, dm - 1, dd).getTime();
  if (b < a) return null;
  return Math.round((b - a) / 86400000) + 1;
}
