/**
 * Busca estruturada de LOCAIS compartilhada pelos sites white label.
 *
 * Um único ponto de entrada para os três tipos usados nos formulários iniciais
 * dos oito serviços, sempre reaproveitando as fontes reais já existentes:
 *  - `city`    -> base própria `public.cities` (RPC `search_cities`);
 *  - `airport` -> cidades + aeroportos (`public/data/airports.csv`, por cidade,
 *                 nome do aeroporto ou código IATA);
 *  - `port`    -> base curada de portos de embarque (`src/lib/cruisePorts.ts`).
 */
import { supabase } from "@/integrations/supabase/client";
import { searchAirports } from "@/lib/airports";
import { searchCruisePorts } from "@/lib/cruisePorts";

export type LocationKind = "city" | "airport" | "port";

export interface LocationSuggestion {
  /** Chave estável para listas. */
  id: string;
  /** Valor gravado no campo do formulário. */
  value: string;
  primary: string;
  secondary: string;
}

interface CityRow {
  id: number;
  name: string;
  country: string;
  admin_name: string | null;
}

async function searchCities(query: string, limit: number): Promise<LocationSuggestion[]> {
  const { data, error } = await supabase.rpc("search_cities", { q: query, max_results: limit });
  if (error || !Array.isArray(data)) return [];
  return (data as CityRow[]).map((row) => {
    const secondary = [row.admin_name, row.country].filter(Boolean).join(", ");
    return {
      id: `city:${row.id}`,
      value: secondary ? `${row.name}, ${secondary}` : row.name,
      primary: row.name,
      secondary: secondary || "Cidade",
    };
  });
}

async function searchAirportOptions(query: string, limit: number): Promise<LocationSuggestion[]> {
  const airports = await searchAirports(query, limit);
  return airports.map((airport) => ({
    id: `airport:${airport.iata}`,
    value: `${airport.city} (${airport.iata}) — ${airport.name}`,
    primary: `${airport.city} (${airport.iata})`,
    secondary: [airport.name, airport.country].filter(Boolean).join(" · "),
  }));
}

function dedupe(items: LocationSuggestion[], limit: number): LocationSuggestion[] {
  const seen = new Set<string>();
  const out: LocationSuggestion[] = [];
  for (const item of items) {
    const key = item.value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Busca sugestões reais para o tipo informado. `airport` intercala cidades e
 * aeroportos: "São Paulo" traz a cidade e os aeroportos relacionados, "GRU"
 * traz Guarulhos e "Orlando" traz a cidade e seus aeroportos.
 */
export async function searchLocations(
  kind: LocationKind,
  query: string,
  limit = 8,
): Promise<LocationSuggestion[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  if (kind === "port") {
    return searchCruisePorts(term, limit).map((port) => ({ id: `port:${port.value}`, ...port }));
  }
  if (kind === "city") return dedupe(await searchCities(term, limit), limit);

  const [airports, cities] = await Promise.all([
    searchAirportOptions(term, limit),
    term.length >= 3 ? searchCities(term, limit) : Promise.resolve([]),
  ]);

  // Código IATA exato/prefixo vem primeiro; caso contrário a cidade lidera.
  const looksLikeIata = /^[a-z]{3}$/i.test(term);
  const merged = looksLikeIata ? [...airports, ...cities] : [...cities.slice(0, 3), ...airports, ...cities];
  return dedupe(merged, limit);
}