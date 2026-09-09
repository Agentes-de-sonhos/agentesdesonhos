import { getAirportSync } from "@/lib/airports";

/**
 * Nome público do aeroporto exibido em orçamentos, PDFs e carteira digital.
 *
 * Regra: o nome personalizado digitado pelo agente SEMPRE vence. Só usamos o
 * nome oficial (base de aeroportos) ou a cidade/código como fallback quando não
 * existe nome personalizado salvo. Normalizações nunca sobrescrevem o texto do
 * usuário.
 */
export function airportDisplayName(input: {
  code?: string | null;
  customName?: string | null;
  city?: string | null;
}): string {
  const custom = (input.customName || "").trim();
  if (custom) return custom;
  const code = (input.code || "").toUpperCase().trim();
  if (code.length === 3) {
    const info = getAirportSync(code);
    if (info?.name) return info.name;
  }
  const city = (input.city || "").trim();
  if (city) return city;
  return code;
}

/** Rótulo curto "JOI – Aeroporto de Joinville" (ou apenas o que existir). */
export function airportDisplayLabel(input: {
  code?: string | null;
  customName?: string | null;
  city?: string | null;
}): string {
  const code = (input.code || "").toUpperCase().trim();
  const name = airportDisplayName(input);
  if (code && name && name !== code) return `${code} – ${name}`;
  return name || code;
}

/**
 * Preenche apenas campos vazios: usado por autocomplete/normalização.
 * Nunca substitui um nome já preenchido manualmente.
 */
export function fillAirportNameIfEmpty(
  currentName: string | null | undefined,
  suggestedName: string | null | undefined,
): string {
  const current = (currentName || "").trim();
  if (current) return current;
  return (suggestedName || "").trim();
}

/**
 * Rótulo usado nas visualizações públicas (orçamento web, PDF e carteira).
 * Preserva o nome personalizado salvo; sem nome personalizado, mantém o
 * comportamento atual (código IATA e, na ausência dele, a cidade).
 */
export function publicAirportText(input: {
  code?: string | null;
  customName?: string | null;
  city?: string | null;
}): string {
  const code = (input.code || "").toUpperCase().trim();
  const custom = (input.customName || "").trim();
  if (custom) return code ? `${code} – ${custom}` : custom;
  return code || (input.city || "").trim();
}
