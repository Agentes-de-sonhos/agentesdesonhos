/**
 * Etapa 3 — datas relativas restritas a cenários de demonstração.
 *
 * Módulo PURO (sem Deno, sem rede) para ser testado diretamente. Define:
 * - o "hoje" no fuso America/Sao_Paulo;
 * - o delta único aplicado a TODAS as datas do cenário (embarque hoje+3,
 *   retorno hoje+10);
 * - quais colunas de data cada tabela mapeada possui;
 * - o deslocamento seguro de datas dentro de JSON (service_data/snapshot),
 *   preservando IDs, tokens, códigos, textos e qualquer valor não-data.
 *
 * Nunca desloca `created_at`/`updated_at`, histórico ou identificadores.
 */

/** Embarque sempre a 3 dias de hoje. */
export const START_OFFSET_DAYS = 3;
/** Retorno sempre a 10 dias de hoje (viagem de 8 dias / 7 noites). */
export const END_OFFSET_DAYS = 10;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Data (YYYY-MM-DD) de "hoje" no fuso America/Sao_Paulo. */
export function saoPauloToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Converte YYYY-MM-DD em dias desde a epoch (sem influência de fuso). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86400000);
}

/** Soma dias a uma data YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Delta (em dias) que leva o embarque atual para hoje+3. O MESMO delta é
 * aplicado a todos os registros, preservando a duração e a ordem relativa.
 */
export function computeDelta(currentStart: string, today = saoPauloToday()): number {
  return dayNumber(addDays(today, START_OFFSET_DAYS)) - dayNumber(currentStart);
}

/** Datas-alvo do cenário após o deslocamento. */
export function targetWindow(today = saoPauloToday()) {
  return { start: addDays(today, START_OFFSET_DAYS), end: addDays(today, END_OFFSET_DAYS) };
}

export type ScenarioLockState = {
  is_demo?: boolean | null;
  dates_shifted_on?: string | null;
  dates_locked_at?: string | null;
};

/** Janela do lock: uma execução em andamento bloqueia as concorrentes. */
export const LOCK_TTL_MS = 60_000;

export type ShiftDecision =
  | { shift: true }
  | { shift: false; reason: "not_demo" | "already_today" | "locked" };

/**
 * Decide se o deslocamento deve rodar: apenas cenários demo, no máximo uma vez
 * por dia e nunca em paralelo (lock com TTL).
 */
export function shouldShift(
  scenario: ScenarioLockState | null | undefined,
  today = saoPauloToday(),
  now: Date = new Date(),
): ShiftDecision {
  if (!scenario || scenario.is_demo !== true) return { shift: false, reason: "not_demo" };
  if (scenario.dates_shifted_on === today) return { shift: false, reason: "already_today" };
  if (scenario.dates_locked_at) {
    const lockedAt = new Date(scenario.dates_locked_at).getTime();
    if (Number.isFinite(lockedAt) && now.getTime() - lockedAt < LOCK_TTL_MS) {
      return { shift: false, reason: "locked" };
    }
  }
  return { shift: true };
}

/**
 * Colunas de data deslocáveis por tabela do cenário, e a coluna JSON que pode
 * conter datas internas. `created_at`, `updated_at`, históricos, tokens, códigos
 * e IDs ficam de fora por construção.
 */
export const SHIFTABLE_COLUMNS: Record<string, { dates: string[]; json?: string[] }> = {
  opportunities: { dates: ["start_date", "end_date"] },
  quotes: { dates: ["start_date", "end_date", "valid_until", "booking_deadline"] },
  quote_services: { dates: [], json: ["service_data"] },
  operations: { dates: ["travel_start_date", "travel_end_date"] },
  operation_services: { dates: ["start_date", "end_date"], json: ["service_data"] },
  travel_files: { dates: ["start_date", "end_date"] },
  travel_file_services: { dates: ["start_date", "end_date"], json: ["snapshot"] },
  itineraries: { dates: ["start_date", "end_date"] },
  itinerary_days: { dates: ["date"] },
  itinerary_activities: { dates: [] },
  trips: { dates: ["start_date", "end_date"] },
  trip_services: { dates: [], json: ["service_data"] },
  sales: { dates: ["start_date", "end_date", "sale_date"] },
  sale_products: { dates: ["expected_date", "received_date"] },
  income_entries: { dates: ["entry_date", "expected_date", "received_date"] },
};

/** Tabelas do cenário afetadas pelo deslocamento. */
export function shiftableTables(): string[] {
  return Object.keys(SHIFTABLE_COLUMNS);
}

/** Chaves de JSON que NÃO podem ser deslocadas mesmo parecendo data. */
const PROTECTED_JSON_KEYS = new Set([
  "created_at",
  "updated_at",
  "id",
  "token",
  "token_hash",
  "share_token",
  "public_access_code",
  "localizador",
  "apolice",
  "demo_key",
]);

const JSON_DATE_KEY = /(^|_)(date|data|dates|inicio|fim|checkin|checkout|validade|embarque|retorno)($|_)/i;

function shiftValue(value: string, delta: number): string {
  if (DATE_ONLY.test(value)) return addDays(value, delta);
  if (ISO_DATETIME.test(value)) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return value;
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString();
  }
  return value;
}

/**
 * Desloca datas dentro de um JSON, recursivamente. Só toca strings de data cujas
 * chaves representem datas — nunca localizadores, códigos ou textos livres.
 */
export function shiftJsonDates<T>(input: T, delta: number): T {
  if (delta === 0 || input == null) return input;
  if (Array.isArray(input)) {
    return input.map((item) => shiftJsonDates(item, delta)) as unknown as T;
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (PROTECTED_JSON_KEYS.has(key)) {
        out[key] = value;
        continue;
      }
      if (typeof value === "string" && JSON_DATE_KEY.test(key)) {
        out[key] = shiftValue(value, delta);
        continue;
      }
      out[key] = shiftJsonDates(value, delta);
    }
    return out as unknown as T;
  }
  return input;
}

export type ScenarioRow = Record<string, unknown> & { id: string };

/**
 * Calcula o patch de uma linha: apenas os campos que realmente mudam. Retorna
 * `null` quando nada muda (evita escrita e loops de atualização).
 */
export function rowPatch(
  table: string,
  row: ScenarioRow,
  delta: number,
): Record<string, unknown> | null {
  const spec = SHIFTABLE_COLUMNS[table];
  if (!spec || delta === 0) return null;
  const patch: Record<string, unknown> = {};
  for (const col of spec.dates) {
    const value = row[col];
    if (typeof value !== "string" || !value) continue;
    const next = shiftValue(value, delta);
    if (next !== value) patch[col] = next;
  }
  for (const col of spec.json ?? []) {
    const value = row[col];
    if (!value || typeof value !== "object") continue;
    const next = shiftJsonDates(value, delta);
    if (JSON.stringify(next) !== JSON.stringify(value)) patch[col] = next;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export type PlannedUpdate = {
  table: string;
  id: string;
  patch: Record<string, unknown>;
  /** Valores anteriores — usados para desfazer tudo em caso de falha. */
  previous: Record<string, unknown>;
};

/** Monta o plano de atualização (e o de rollback) para as linhas carregadas. */
export function planUpdates(
  table: string,
  rows: ScenarioRow[],
  delta: number,
): PlannedUpdate[] {
  const out: PlannedUpdate[] = [];
  for (const row of rows) {
    const patch = rowPatch(table, row, delta);
    if (!patch) continue;
    const previous: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) previous[key] = row[key] ?? null;
    out.push({ table, id: row.id, patch, previous });
  }
  return out;
}

/** Inverte o plano aplicado — restaura exatamente os valores anteriores. */
export function rollbackPlan(applied: PlannedUpdate[]): PlannedUpdate[] {
  return [...applied]
    .reverse()
    .map((u) => ({ table: u.table, id: u.id, patch: u.previous, previous: u.patch }));
}

/** Colunas que o deslocamento nunca pode tocar (garantia explícita nos testes). */
export const NEVER_SHIFTED = [
  "created_at",
  "updated_at",
  "id",
  "share_token",
  "public_access_code",
  "access_password",
  "token_hash",
  "changed_at",
] as const;
