/**
 * Splits a free-text destination string into prioritized search parts.
 * Examples:
 *   "Florença e Roma"       → ["Florença", "Roma"]
 *   "Roma, Itália"          → ["Roma", "Itália"]
 *   "Florença / Roma"       → ["Florença", "Roma"]
 *   "Paris - França"        → ["Paris", "França"]
 *   "Tóquio + Kyoto + Osaka"→ ["Tóquio", "Kyoto", "Osaka"]
 *   "Maldivas"              → ["Maldivas"]
 */
export function parseDestinationParts(destination?: string | null): string[] {
  if (!destination) return [];
  const raw = String(destination).trim();
  if (!raw) return [];
  // Split on common separators: comma, slash, plus, dash, semicolon, " e ", " & ", " and ", " y "
  const parts = raw
    .split(/\s*(?:,|\/|\+|;|\||\s-\s|\s—\s|\s&\s|\s+e\s+|\s+and\s+|\s+y\s+)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  // Deduplicate, keep order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out.length ? out : [raw];
}
