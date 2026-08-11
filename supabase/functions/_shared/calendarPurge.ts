// Pure helpers for the authorized, title-scoped Google Calendar purge job.
//
// The purge is destructive on Google's side, so every decision that selects a
// remote target is expressed here and covered by tests. Nothing in this module
// touches credentials or logs identifiers.

/** The only four titles this job may ever remove. Exact match, no normalization. */
export const PURGE_TARGET_TITLES: readonly string[] = [
  "Projeto Neuroplasticidade – Repertório Musical",
  "Projeto Neuroplasticidade – Repertório Musical (Manhã)",
  "Projeto Neuroplasticidade – Repertório Musical (Noite)",
  "Projeto Neuroplasticidade – Leitura",
];

/** Query used for the complementary Google-side scan. */
export const PURGE_SCAN_QUERY = "Projeto Neuroplasticidade";

/** Exact title guard applied locally to every remote candidate. */
export function matchesPurgeTitle(summary: unknown): boolean {
  return typeof summary === "string" && PURGE_TARGET_TITLES.includes(summary);
}

export type DeleteOutcome = "removed" | "already_gone" | "transient" | "permanent";

/** Maps a Google DELETE response to a purge outcome. */
export function classifyDeleteStatus(status: number, body = ""): DeleteOutcome {
  if (status === 200 || status === 204) return "removed";
  if (status === 404 || status === 410) return "already_gone";
  if (status === 429 || status >= 500) return "transient";
  if (status === 403) {
    const lower = body.toLowerCase();
    const quota = lower.includes("ratelimit") ||
      lower.includes("rate limit") ||
      lower.includes("quota") ||
      lower.includes("usagelimits") ||
      lower.includes("backenderror");
    return quota ? "transient" : "permanent";
  }
  return "permanent";
}

/**
 * Collapses mapped ids to one remote target each, preferring the recurring
 * master so a whole series is removed with a single call.
 */
export function dedupeRemoteTargets(
  rows: Array<{ google_event_id?: string | null; recurring_event_id?: string | null }>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const target = row.recurring_event_id || row.google_event_id;
    if (!target || seen.has(target)) continue;
    seen.add(target);
    out.push(target);
  }
  return out;
}

/** Aggregated, identifier-free error tally. */
export function bumpErrorSummary(
  summary: Record<string, number> | null | undefined,
  status: number | string,
): Record<string, number> {
  const next = { ...(summary || {}) };
  const key = `status_${status}`;
  next[key] = (next[key] || 0) + 1;
  return next;
}

export interface ScanUrlParams {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  pageToken?: string | null;
  maxResults?: number;
}

/** Complementary scan URL: masters only (singleEvents=false) inside the window. */
export function buildPurgeScanUrl(params: ScanUrlParams): string {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events`,
  );
  url.searchParams.set("q", PURGE_SCAN_QUERY);
  url.searchParams.set("timeMin", params.timeMin);
  url.searchParams.set("timeMax", params.timeMax);
  url.searchParams.set("singleEvents", "false");
  url.searchParams.set("showDeleted", "false");
  url.searchParams.set("maxResults", String(params.maxResults ?? 250));
  if (params.pageToken) url.searchParams.set("pageToken", params.pageToken);
  return url.toString();
}

export const PURGE_BATCH_SIZE = 60;
/** Small bounded concurrency: fast enough for 64.9k targets, gentle on quota. */
export const PURGE_DELETE_CONCURRENCY = 5;
/** Consecutive rate-limit backoffs tolerated inside one run before deferring. */
export const PURGE_MAX_BACKOFFS = 6;
export const PURGE_RUN_BUDGET_MS = 40_000;

export function hasPurgeBudgetLeft(elapsedMs: number, budgetMs = PURGE_RUN_BUDGET_MS): boolean {
  return elapsedMs < budgetMs;
}
