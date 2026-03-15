let airportsMap: Map<string, { name: string; city: string; country: string }> | null = null;
let loadingPromise: Promise<void> | null = null;

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
    const lines = text.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // CSV: id,airport_name,city,country,iata_code
      const parts = line.split(",");
      if (parts.length < 5) continue;
      const iata = parts[4].trim().toUpperCase();
      if (iata.length === 3) {
        map.set(iata, {
          name: parts[1].trim(),
          city: parts[2].trim(),
          country: parts[3].trim(),
        });
      }
    }
    airportsMap = map;
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
