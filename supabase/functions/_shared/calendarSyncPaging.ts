/**
 * Block 2 — scalability primitives for the Google Calendar integration.
 *
 * Pure, dependency-free helpers so both the edge functions and the unit tests
 * share the exact same decisions about paging, budgets, fairness and recovery.
 * Nothing here deletes data: every "reset" only clears cursors/sync tokens.
 */

export const PULL_PAGE_SIZE = 250;

export interface PagingLimits {
  /** Google list pages processed per execution (pull). */
  maxPages: number;
  /** Google items processed per execution (pull). */
  maxItems: number;
  /** Local events scanned/pushed per execution. */
  maxPushItems: number;
}

export const DEFAULT_PAGING_LIMITS: PagingLimits = {
  maxPages: 6,
  maxItems: 1200,
  maxPushItems: 300,
};

function readPositiveInt(raw: string | undefined | null, fallback: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

/** Limits are configurable through env, always clamped to safe ceilings. */
export function getPagingLimits(env: Record<string, string | undefined> = {}): PagingLimits {
  return {
    maxPages: readPositiveInt(env.GCAL_MAX_PAGES_PER_RUN, DEFAULT_PAGING_LIMITS.maxPages, 40),
    maxItems: readPositiveInt(env.GCAL_MAX_ITEMS_PER_RUN, DEFAULT_PAGING_LIMITS.maxItems, 10_000),
    maxPushItems: readPositiveInt(env.GCAL_MAX_PUSH_ITEMS_PER_RUN, DEFAULT_PAGING_LIMITS.maxPushItems, 2_000),
  };
}

export type PullMode = "bootstrap" | "incremental";

export interface TokenPagingState {
  sync_token?: string | null;
  bootstrap_page_token?: string | null;
  bootstrap_completed_at?: string | null;
  incremental_page_token?: string | null;
}

/**
 * Incremental only when the bootstrap finished AND a sync token exists.
 * A pending bootstrap page always wins so a partial run resumes exactly where
 * it stopped instead of restarting a full rescan.
 */
export function resolvePullMode(state: TokenPagingState | null | undefined): PullMode {
  if (!state) return "bootstrap";
  if (state.bootstrap_page_token) return "bootstrap";
  if (state.sync_token && state.bootstrap_completed_at) return "incremental";
  return "bootstrap";
}

/**
 * Resolved page token for the current run. Bootstrap resumes from
 * bootstrap_page_token, incremental from incremental_page_token, so a partial
 * incremental run never restarts from the first page.
 */
export function resolveResumePageToken(
  mode: PullMode,
  state: TokenPagingState | null | undefined,
): string | null {
  if (!state) return null;
  return (mode === "bootstrap" ? state.bootstrap_page_token : state.incremental_page_token) ?? null;
}

export interface ListUrlParams {
  windowStart: string;
  windowEnd: string;
  pageToken?: string | null;
  syncToken?: string | null;
  pageSize?: number;
}

const EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Builds the events.list URL. With a syncToken, Google forbids timeMin/timeMax/
 * orderBy and requires showDeleted to stay enabled, so those params are omitted.
 */
export function buildEventsListUrl(params: ListUrlParams): string {
  const size = params.pageSize ?? PULL_PAGE_SIZE;
  const qs = new URLSearchParams();
  qs.set("singleEvents", "true");
  qs.set("showDeleted", "true");
  qs.set("maxResults", String(size));
  if (params.syncToken) {
    qs.set("syncToken", params.syncToken);
  } else {
    qs.set("timeMin", params.windowStart);
    qs.set("timeMax", params.windowEnd);
    qs.set("orderBy", "startTime");
  }
  if (params.pageToken) qs.set("pageToken", params.pageToken);
  return `${EVENTS_ENDPOINT}?${qs.toString()}`;
}

/** Google signals an expired/invalid sync token or page token with HTTP 410. */
export function isCursorGoneStatus(status: number): boolean {
  return status === 410;
}

export interface PageBudgetState {
  pages: number;
  items: number;
}

/** True when this execution must stop paging and persist its cursor. */
export function isBudgetExhausted(state: PageBudgetState, limits: PagingLimits): boolean {
  return state.pages >= limits.maxPages || state.items >= limits.maxItems;
}

export interface BootstrapProgressInput {
  nextPageToken?: string | null;
  nextSyncToken?: string | null;
  pagesDone: number;
  itemsDone: number;
  windowStart: string;
  windowEnd: string;
  startedAt?: string | null;
  now?: string;
}

/**
 * Bootstrap bookkeeping. The sync token is persisted (and the bootstrap marked
 * complete) ONLY when Google returned no further page token.
 */
export function computeBootstrapUpdate(input: BootstrapProgressInput): Record<string, unknown> {
  const now = input.now ?? new Date().toISOString();
  const base: Record<string, unknown> = {
    bootstrap_pages_done: input.pagesDone,
    bootstrap_items_done: input.itemsDone,
    bootstrap_window_start: input.windowStart,
    bootstrap_window_end: input.windowEnd,
    bootstrap_started_at: input.startedAt || now,
    bootstrap_last_error: null,
  };
  if (input.nextPageToken) {
    return {
      ...base,
      bootstrap_page_token: input.nextPageToken,
      bootstrap_completed_at: null,
    };
  }
  return {
    ...base,
    bootstrap_page_token: null,
    bootstrap_completed_at: now,
    ...(input.nextSyncToken ? { sync_token: input.nextSyncToken } : {}),
  };
}

export interface IncrementalProgressInput {
  nextPageToken?: string | null;
  nextSyncToken?: string | null;
  currentSyncToken?: string | null;
  pagesDone?: number;
  itemsDone?: number;
  startedAt?: string | null;
  now?: string;
}

/**
 * Incremental bookkeeping. While more pages remain, the base sync token is kept
 * AND the pending pageToken is persisted, so the next run resumes exactly where
 * this one stopped instead of restarting the first page. Only on the last page
 * is incremental_page_token cleared and nextSyncToken adopted.
 */
export function computeIncrementalUpdate(input: IncrementalProgressInput): Record<string, unknown> {
  const now = input.now ?? new Date().toISOString();
  const counters: Record<string, unknown> = {
    incremental_pages_done: input.pagesDone ?? 0,
    incremental_items_done: input.itemsDone ?? 0,
  };
  if (input.nextPageToken) {
    return {
      ...counters,
      // Base cursor preserved: never replaced mid-walk.
      sync_token: input.currentSyncToken ?? null,
      incremental_page_token: input.nextPageToken,
      incremental_started_at: input.startedAt || now,
    };
  }
  return {
    ...counters,
    incremental_page_token: null,
    incremental_started_at: null,
    ...(input.nextSyncToken ? { sync_token: input.nextSyncToken } : {}),
  };
}

/** True while an incremental walk still has pages pending. */
export function isIncrementalInProgress(state: { incremental_page_token?: string | null } | null | undefined): boolean {
  return !!state?.incremental_page_token;
}

/**
 * HTTP 410 recovery: drop only the cursors and restart the bootstrap.
 * Never touches events, mappings or tokens.
 */
export function computeCursorResetUpdate(now = new Date().toISOString()): Record<string, unknown> {
  return {
    sync_token: null,
    bootstrap_page_token: null,
    incremental_page_token: null,
    incremental_started_at: null,
    incremental_pages_done: 0,
    incremental_items_done: 0,
    bootstrap_started_at: now,
    bootstrap_completed_at: null,
    bootstrap_pages_done: 0,
    bootstrap_items_done: 0,
    bootstrap_last_error: "cursor_expired_410",
  };
}

export type SyncLifecycleStatus = "synced" | "bootstrap" | "error";

/** A partial bootstrap must never be reported as a finished sync. */
export function resolveSyncStatus(opts: { bootstrapInProgress: boolean; errors: number }): SyncLifecycleStatus {
  if (opts.errors > 0) return "error";
  return opts.bootstrapInProgress ? "bootstrap" : "synced";
}

/** Transient aborts/timeouts must not flag the connection for re-consent. */
export function isTransientSyncError(err: unknown): boolean {
  const name = (err as { name?: string })?.name || "";
  const message = String((err as { message?: string })?.message || err || "");
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    /abort|timed?\s*out|timeout|deadline/i.test(message)
  );
}

export interface PushCursor {
  updated_at: string | null;
  event_id: string | null;
}

/** Stable composite cursor — never an offset, so concurrent writes can't skip rows. */
export function nextPushCursor(rows: Array<{ id: string; updated_at?: string | null }>, previous: PushCursor): PushCursor {
  if (!rows.length) return previous;
  const last = rows[rows.length - 1];
  return { updated_at: last.updated_at ?? previous.updated_at, event_id: last.id };
}

/** Local scan finished when Google-side page size wasn't filled. */
export function isPushScanComplete(rowCount: number, limit: number): boolean {
  return rowCount < limit;
}

export interface DeletedPushCursor {
  deleted_at: string | null;
  event_id: string | null;
}

/**
 * Composite cursor for the deletion queue. Advances only over rows actually
 * processed, and the (deleted_at, id) tiebreaker keeps identical timestamps
 * with different UUIDs from starving the queue.
 */
export function nextDeletedCursor(
  processed: Array<{ id: string; deleted_at?: string | null }>,
  previous: DeletedPushCursor,
): DeletedPushCursor {
  if (!processed.length) return previous;
  const last = processed[processed.length - 1];
  return { deleted_at: last.deleted_at ?? previous.deleted_at, event_id: last.id };
}

/** PostgREST filter for "(deleted_at, id) > cursor" keyset pagination. */
export function buildKeysetOrFilter(column: string, value: string, id: string): string {
  return `${column}.gt.${value},and(${column}.eq.${value},id.gt.${id})`;
}

export interface CronEligibleToken {
  user_id: string;
  last_sync_at?: string | null;
}

/**
 * Fairness: never-synced first, then oldest last_sync_at. Because every run
 * updates last_sync_at, the heavy account rotates to the back of the queue.
 */
export function orderEligibleTokens<T extends CronEligibleToken>(tokens: T[]): T[] {
  return [...tokens].sort((a, b) => {
    const ta = a.last_sync_at ? new Date(a.last_sync_at).getTime() : -1;
    const tb = b.last_sync_at ? new Date(b.last_sync_at).getTime() : -1;
    return ta - tb;
  });
}

export interface CronBudget {
  /** Whole-run budget for the cron invocation. */
  totalMs: number;
  /** Per-user AbortController timeout. */
  perUserMs: number;
  /** Hard ceiling on users touched in a single cron run. */
  maxUsers: number;
}

export const DEFAULT_CRON_BUDGET: CronBudget = { totalMs: 55_000, perUserMs: 20_000, maxUsers: 25 };

export function getCronBudget(env: Record<string, string | undefined> = {}): CronBudget {
  return {
    totalMs: readPositiveInt(env.GCAL_CRON_TOTAL_MS, DEFAULT_CRON_BUDGET.totalMs, 240_000),
    perUserMs: readPositiveInt(env.GCAL_CRON_PER_USER_MS, DEFAULT_CRON_BUDGET.perUserMs, 120_000),
    maxUsers: readPositiveInt(env.GCAL_CRON_MAX_USERS, DEFAULT_CRON_BUDGET.maxUsers, 500),
  };
}

/** Safety margin reserved for bookkeeping/response after the last dispatch. */
export const CRON_SAFETY_MARGIN_MS = 2_000;
/** A dispatch is pointless below this window. */
export const CRON_MIN_SLICE_MS = 3_000;

/**
 * Effective per-user timeout: never allowed to exceed the remaining run budget
 * minus the safety margin, so the whole cron respects GCAL_CRON_TOTAL_MS.
 * Returns 0 when there is no usable window left.
 */
export function effectiveUserTimeoutMs(elapsedMs: number, budget: CronBudget): number {
  const remaining = budget.totalMs - elapsedMs - CRON_SAFETY_MARGIN_MS;
  if (remaining < CRON_MIN_SLICE_MS) return 0;
  return Math.min(budget.perUserMs, remaining);
}

/** Stop dispatching when the user cap is reached or no minimum window is left. */
export function hasCronBudgetLeft(elapsedMs: number, processed: number, budget: CronBudget): boolean {
  if (processed >= budget.maxUsers) return false;
  return effectiveUserTimeoutMs(elapsedMs, budget) > 0;
}