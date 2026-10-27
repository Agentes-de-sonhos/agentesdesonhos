/**
 * Busca de cidades em português do Brasil sobre a base `public.cities`
 * (RPC `search_cities`, que guarda nomes internacionais em inglês).
 *
 * - Apelidos pt-BR → nome na base (ex.: "Lisboa" → "Lisbon"), exibidos em português.
 * - Destinos turísticos que não são municípios (ex.: Fernando de Noronha),
 *   ausentes da base demográfica, entram por uma lista curada local.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CityRow {
  id: number | string;
  name: string;
  country: string;
  admin_name: string | null;
  iso2: string | null;
  lat: number | null;
  lng: number | null;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();

/** [nome em português, nome na base, ISO2 do país] */
export const PT_BR_CITY_ALIASES: Array<[string, string, string]> = [
  ["Lisboa", "Lisbon", "PT"], ["Roma", "Rome", "IT"], ["Londres", "London", "GB"],
  ["Florença", "Florence", "IT"], ["Veneza", "Venice", "IT"], ["Milão", "Milan", "IT"],
  ["Nápoles", "Naples", "IT"], ["Turim", "Turin", "IT"], ["Gênova", "Genoa", "IT"],
  ["Viena", "Vienna", "AT"], ["Atenas", "Athens", "GR"], ["Praga", "Prague", "CZ"],
  ["Munique", "Munich", "DE"], ["Berlim", "Berlin", "DE"], ["Colônia", "Cologne", "DE"],
  ["Frankfurt", "Frankfurt", "DE"], ["Genebra", "Geneva", "CH"], ["Zurique", "Zurich", "CH"],
  ["Lucerna", "Lucerne", "CH"], ["Bruxelas", "Brussels", "BE"], ["Bruges", "Brugge", "BE"],
  ["Amsterdã", "Amsterdam", "NL"], ["Copenhague", "Copenhagen", "DK"],
  ["Estocolmo", "Stockholm", "SE"], ["Varsóvia", "Warsaw", "PL"], ["Cracóvia", "Kraków", "PL"],
  ["Moscou", "Moscow", "RU"], ["São Petersburgo", "Saint Petersburg", "RU"],
  ["Edimburgo", "Edinburgh", "GB"], ["Sevilha", "Seville", "ES"], ["Córdoba", "Córdoba", "ES"],
  ["Istambul", "Istanbul", "TR"], ["Jerusalém", "Jerusalem", "IL"], ["Cairo", "Cairo", "EG"],
  ["Marrakech", "Marrakech", "MA"], ["Cidade do Cabo", "Cape Town", "ZA"],
  ["Nova York", "New York", "US"], ["Nova Iorque", "New York", "US"],
  ["Nova Orleans", "New Orleans", "US"], ["Filadélfia", "Philadelphia", "US"],
  ["São Francisco", "San Francisco", "US"], ["Washington", "Washington", "US"],
  ["Cidade do México", "Mexico City", "MX"], ["Cidade do Panamá", "Panama City", "PA"],
  ["Tóquio", "Tokyo", "JP"], ["Quioto", "Kyoto", "JP"], ["Pequim", "Beijing", "CN"],
  ["Xangai", "Shanghai", "CN"], ["Cingapura", "Singapore", "SG"], ["Bangcoc", "Bangkok", "TH"],
  ["Nova Délhi", "New Delhi", "IN"], ["Seul", "Seoul", "KR"], ["Dubai", "Dubai", "AE"],
  ["Abu Dhabi", "Abu Dhabi", "AE"], ["Doha", "Doha", "QA"], ["Bariloche", "San Carlos de Bariloche", "AR"],
  ["Mendoza", "Mendoza", "AR"], ["Ushuaia", "Ushuaia", "AR"], ["Santiago", "Santiago", "CL"],
  ["Cusco", "Cusco", "PE"], ["Cartagena", "Cartagena", "CO"], ["Havana", "Havana", "CU"],
  ["Punta Cana", "Punta Cana", "DO"], ["Porto", "Porto", "PT"],
];

/** Destinos turísticos que não constam como cidade na base demográfica. */
const CURATED: Array<Omit<CityRow, "id"> & { id: string }> = [
  { id: "t:noronha", name: "Fernando de Noronha", admin_name: "Pernambuco", country: "Brazil", iso2: "BR", lat: -3.8549, lng: -32.4241 },
  { id: "t:galinhas", name: "Porto de Galinhas", admin_name: "Pernambuco", country: "Brazil", iso2: "BR", lat: -8.5036, lng: -35.0033 },
  { id: "t:pipa", name: "Praia da Pipa", admin_name: "Rio Grande do Norte", country: "Brazil", iso2: "BR", lat: -6.2283, lng: -35.0461 },
  { id: "t:arraial", name: "Arraial d'Ajuda", admin_name: "Bahia", country: "Brazil", iso2: "BR", lat: -16.4886, lng: -39.0703 },
  { id: "t:morro", name: "Morro de São Paulo", admin_name: "Bahia", country: "Brazil", iso2: "BR", lat: -13.3797, lng: -38.9139 },
  { id: "t:caraiva", name: "Caraíva", admin_name: "Bahia", country: "Brazil", iso2: "BR", lat: -16.8105, lng: -39.1471 },
  { id: "t:chapada", name: "Chapada dos Veadeiros", admin_name: "Goiás", country: "Brazil", iso2: "BR", lat: -14.1316, lng: -47.5156 },
  { id: "t:lencois", name: "Lençóis Maranhenses", admin_name: "Maranhão", country: "Brazil", iso2: "BR", lat: -2.4858, lng: -43.1283 },
  { id: "t:trindade", name: "Trindade (Paraty)", admin_name: "Rio de Janeiro", country: "Brazil", iso2: "BR", lat: -23.3534, lng: -44.7228 },
  { id: "t:ilhagrande", name: "Ilha Grande", admin_name: "Rio de Janeiro", country: "Brazil", iso2: "BR", lat: -23.1418, lng: -44.1689 },
  { id: "t:boipeba", name: "Boipeba", admin_name: "Bahia", country: "Brazil", iso2: "BR", lat: -13.6197, lng: -38.9264 },
  { id: "t:milagres", name: "São Miguel dos Milagres", admin_name: "Alagoas", country: "Brazil", iso2: "BR", lat: -9.2647, lng: -35.3756 },
];

const matches = (candidate: string, q: string) => {
  const c = norm(candidate);
  return c.startsWith(q) || c.includes(" " + q);
};

/** Busca cidades priorizando nomes em português e destinos turísticos curados. */
export async function searchCitiesPtBr(query: string, maxResults = 10): Promise<CityRow[]> {
  const q = norm(query);
  if (q.length < 2) return [];

  const curated = CURATED.filter((c) => matches(c.name, q));
  const aliases = PT_BR_CITY_ALIASES.filter(([pt]) => matches(pt, q)).slice(0, 4);

  const [base, ...aliasResults] = await Promise.all([
    supabase.rpc("search_cities", { q: query.trim(), max_results: maxResults }),
    ...aliases.map(([, en]) => supabase.rpc("search_cities", { q: en, max_results: 10 })),
  ]);

  const aliasRows: CityRow[] = [];
  aliases.forEach(([pt, en, iso], i) => {
    const rows = (aliasResults[i]?.data as CityRow[] | null) || [];
    const hit = rows.find((r) => norm(r.name) === norm(en) && r.iso2 === iso);
    if (hit) aliasRows.push({ ...hit, name: pt });
  });

  const baseRows = (Array.isArray(base.data) ? base.data : []) as CityRow[];
  const seen = new Set<string>();
  const out: CityRow[] = [];
  for (const r of [...curated, ...aliasRows, ...baseRows]) {
    const key = String(r.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= maxResults) break;
  }
  return out;
}
