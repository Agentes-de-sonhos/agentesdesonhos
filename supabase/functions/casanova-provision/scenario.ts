/**
 * Fundação do cenário demonstrativo (Etapa 1).
 *
 * Regras invioláveis:
 * - todo registro fictício criado pelo provisionamento é MAPEADO em
 *   `demo_scenario_records`;
 * - cleanup/reset percorre SOMENTE o mapa — nunca `user_id` amplo — de modo que
 *   registros manuais do tenant (ex.: o cliente "Fernando") são preservados;
 * - automações de demonstração (datas relativas) exigem um cenário marcado como
 *   `is_demo`.
 *
 * Este módulo é puro (sem Deno, sem rede) para poder ser testado diretamente.
 */

export const SCENARIO_SLUG = "casa-nova-tur";

/** Ordem segura de remoção: dependentes antes das entidades base. */
export const CLEANUP_ORDER = [
  "client_area_wallet_grants",
  "income_entries",
  "sales",
  "trip_services",
  "trips",
  "itinerary_activities",
  "itinerary_days",
  "itineraries",
  "travel_file_services",
  "travel_files",
  "operation_services",
  "operations",
  "quote_services",
  "quotes",
  "opportunities",
  "travelers",
  "clients",
] as const;

export type ScenarioRecord = {
  table_name: string;
  record_id: string;
  record_role?: string | null;
};

/**
 * Agrupa os registros mapeados na ordem de remoção. Tabelas desconhecidas ficam
 * no fim (nunca são ignoradas silenciosamente).
 */
export function cleanupPlan(records: ScenarioRecord[]): { table: string; ids: string[] }[] {
  const byTable = new Map<string, string[]>();
  for (const r of records) {
    if (!r?.table_name || !r?.record_id) continue;
    const ids = byTable.get(r.table_name) ?? [];
    if (!ids.includes(r.record_id)) ids.push(r.record_id);
    byTable.set(r.table_name, ids);
  }
  const known = CLEANUP_ORDER.filter((t) => byTable.has(t)).map((t) => ({
    table: t as string,
    ids: byTable.get(t)!,
  }));
  const extra = [...byTable.keys()]
    .filter((t) => !(CLEANUP_ORDER as readonly string[]).includes(t))
    .map((t) => ({ table: t, ids: byTable.get(t)! }));
  return [...known, ...extra];
}

/** Registros mapeados que ainda não constam no mapa (idempotência do registro). */
export function newMappings(
  existing: ScenarioRecord[],
  desired: ScenarioRecord[],
): ScenarioRecord[] {
  const key = (r: ScenarioRecord) => `${r.table_name}:${r.record_id}`;
  const seen = new Set(existing.map(key));
  const out: ScenarioRecord[] = [];
  for (const r of desired) {
    if (!r?.table_name || !r?.record_id) continue;
    if (seen.has(key(r))) continue;
    seen.add(key(r));
    out.push(r);
  }
  return out;
}

/** Um registro só pode ser removido pelo cleanup se estiver mapeado no cenário. */
export function isScenarioOwned(records: ScenarioRecord[], table: string, id: string): boolean {
  return records.some((r) => r.table_name === table && r.record_id === id);
}
