// Mapping of common airline IATA/ICAO codes (and operator strings returned
// by FlightAware) to their full commercial name. Used to enrich flight
// import data so the user sees "LATAM Airlines" instead of just "LA".

const AIRLINES: Record<string, string> = {
  // Brasil / América Latina
  LA: "LATAM Airlines",
  TAM: "LATAM Airlines",
  G3: "GOL Linhas Aéreas",
  GLO: "GOL Linhas Aéreas",
  AD: "Azul Linhas Aéreas",
  AZU: "Azul Linhas Aéreas",
  JJ: "LATAM Brasil",
  O6: "Avianca Brasil",
  AV: "Avianca",
  AVA: "Avianca",
  CM: "Copa Airlines",
  CMP: "Copa Airlines",
  AR: "Aerolíneas Argentinas",
  ARG: "Aerolíneas Argentinas",
  AM: "Aeroméxico",
  AMX: "Aeroméxico",
  LP: "LATAM Perú",
  H2: "Sky Airline",
  JA: "JetSmart",
  // EUA / Canadá
  AA: "American Airlines",
  AAL: "American Airlines",
  DL: "Delta Air Lines",
  DAL: "Delta Air Lines",
  UA: "United Airlines",
  UAL: "United Airlines",
  B6: "JetBlue Airways",
  JBU: "JetBlue Airways",
  AS: "Alaska Airlines",
  ASA: "Alaska Airlines",
  WN: "Southwest Airlines",
  SWA: "Southwest Airlines",
  AC: "Air Canada",
  ACA: "Air Canada",
  WS: "WestJet",
  WJA: "WestJet",
  F9: "Frontier Airlines",
  NK: "Spirit Airlines",
  // Europa
  AF: "Air France",
  AFR: "Air France",
  KL: "KLM Royal Dutch Airlines",
  KLM: "KLM Royal Dutch Airlines",
  LH: "Lufthansa",
  DLH: "Lufthansa",
  LX: "SWISS",
  SWR: "SWISS",
  OS: "Austrian Airlines",
  AUA: "Austrian Airlines",
  IB: "Iberia",
  IBE: "Iberia",
  UX: "Air Europa",
  AEA: "Air Europa",
  TP: "TAP Air Portugal",
  TAP: "TAP Air Portugal",
  BA: "British Airways",
  BAW: "British Airways",
  VS: "Virgin Atlantic",
  VIR: "Virgin Atlantic",
  AZ: "ITA Airways",
  ITY: "ITA Airways",
  AY: "Finnair",
  FIN: "Finnair",
  SK: "SAS Scandinavian Airlines",
  SAS: "SAS Scandinavian Airlines",
  TK: "Turkish Airlines",
  THY: "Turkish Airlines",
  EI: "Aer Lingus",
  EIN: "Aer Lingus",
  LO: "LOT Polish Airlines",
  LOT: "LOT Polish Airlines",
  FR: "Ryanair",
  RYR: "Ryanair",
  U2: "easyJet",
  EZY: "easyJet",
  // Oriente Médio / Ásia / Oceania
  EK: "Emirates",
  UAE: "Emirates",
  QR: "Qatar Airways",
  QTR: "Qatar Airways",
  EY: "Etihad Airways",
  ETD: "Etihad Airways",
  SV: "Saudia",
  SVA: "Saudia",
  MS: "EgyptAir",
  MSR: "EgyptAir",
  ET: "Ethiopian Airlines",
  ETH: "Ethiopian Airlines",
  SA: "South African Airways",
  SAA: "South African Airways",
  SQ: "Singapore Airlines",
  SIA: "Singapore Airlines",
  CX: "Cathay Pacific",
  CPA: "Cathay Pacific",
  JL: "Japan Airlines",
  JAL: "Japan Airlines",
  NH: "All Nippon Airways",
  ANA: "All Nippon Airways",
  KE: "Korean Air",
  KAL: "Korean Air",
  OZ: "Asiana Airlines",
  AAR: "Asiana Airlines",
  CA: "Air China",
  CCA: "Air China",
  MU: "China Eastern",
  CES: "China Eastern",
  CZ: "China Southern",
  CSN: "China Southern",
  TG: "Thai Airways",
  THA: "Thai Airways",
  QF: "Qantas",
  QFA: "Qantas",
  NZ: "Air New Zealand",
  ANZ: "Air New Zealand",
};

export function getAirlineName(code?: string | null): string | null {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  return AIRLINES[key] || null;
}

// Returns the best display name for an airline. If `code` already looks like
// a full name (more than 3 chars and not an IATA/ICAO code we recognize),
// it is returned unchanged.
export function resolveAirlineDisplay(code?: string | null): string {
  if (!code) return "";
  const trimmed = String(code).trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (AIRLINES[upper]) return AIRLINES[upper];
  // Already a full name (contains lowercase, spaces, or is longer than 3 chars)
  if (trimmed.length > 3 || /\s/.test(trimmed) || trimmed !== upper) return trimmed;
  return trimmed;
}

// Lista única de companhias aéreas (para autocomplete em formulários).
export const AIRLINE_NAMES: string[] = Array.from(new Set(Object.values(AIRLINES))).sort((a, b) =>
  a.localeCompare(b, "pt-BR")
);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Sugestões de companhias aéreas a partir de um termo (matching por prefixo/contém, case/accent-insensitive). */
export function suggestAirlines(query: string, limit = 8): string[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of AIRLINE_NAMES) {
    const n = normalize(name);
    if (n.startsWith(q)) starts.push(name);
    else if (n.includes(q)) contains.push(name);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}