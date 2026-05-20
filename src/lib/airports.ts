let airportsMap: Map<string, { name: string; city: string; country: string }> | null = null;
let loadingPromise: Promise<void> | null = null;
let airportsList: Array<{ iata: string; name: string; city: string; country: string; _search: string }> | null = null;

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function loadAirports() {
  if (airportsMap) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }
  loadingPromise = (async () => {
    const res = await fetch("/data/airports.csv");
    const text = await res.text();
    const map = new Map<string, { name: string; city: string; country: string }>();
    const list: Array<{ iata: string; name: string; city: string; country: string; _search: string }> = [];
    const lines = text.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // CSV: id,airport_name,city,country,iata_code
      const parts = line.split(",");
      if (parts.length < 5) continue;
      const iata = parts[4].trim().toUpperCase();
      if (iata.length === 3) {
        const name = parts[1].trim();
        const city = parts[2].trim();
        const country = parts[3].trim();
        map.set(iata, { name, city, country });
        list.push({
          iata, name, city, country,
          _search: normalize(`${iata} ${city} ${name} ${country}`),
        });
      }
    }
    airportsMap = map;
    airportsList = list;
  })();
  await loadingPromise;
}

export async function getAirportsMap() {
  await loadAirports();
  return airportsMap!;
}

export function getAirportSync(code: string): { name: string; city: string; country: string } | undefined {
  return airportsMap?.get(code.toUpperCase());
}

export function formatAirportLabel(code: string): string {
  if (!code) return "";
  const info = airportsMap?.get(code.toUpperCase());
  if (!info) return code;
  return `${code} – ${info.city}`;
}

export function isAirportsLoaded(): boolean {
  return airportsMap !== null;
}

export interface AirportSuggestion {
  iata: string;
  name: string;
  city: string;
  country: string;
}

/** Search by IATA code, city, or airport name. Returns top `limit` results. */
export function searchAirportsSync(query: string, limit = 8): AirportSuggestion[] {
  if (!airportsList) return [];
  const q = normalize(query);
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const results: Array<{ a: AirportSuggestion; score: number }> = [];
  for (const a of airportsList) {
    if (!tokens.every(t => a._search.includes(t))) continue;
    let score = 0;
    if (a.iata.toLowerCase() === q) score += 1000;
    else if (a.iata.toLowerCase().startsWith(q)) score += 500;
    const cityN = normalize(a.city);
    if (cityN === q) score += 400;
    else if (cityN.startsWith(q)) score += 200;
    const nameN = normalize(a.name);
    if (nameN.startsWith(q)) score += 100;
    // Prefer well-known airports (shorter list, no scoring data here): mild bonus by country
    results.push({ a, score });
  }
  results.sort((x, y) => y.score - x.score);
  return results.slice(0, limit).map(r => r.a);
}

export async function searchAirports(query: string, limit = 8): Promise<AirportSuggestion[]> {
  await loadAirports();
  return searchAirportsSync(query, limit);
}
