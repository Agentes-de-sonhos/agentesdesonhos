import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildEventsListUrl,
  computeBootstrapUpdate,
  computeCursorResetUpdate,
  computeIncrementalUpdate,
  DEFAULT_PAGING_LIMITS,
  getCronBudget,
  getPagingLimits,
  hasCronBudgetLeft,
  isBudgetExhausted,
  isCursorGoneStatus,
  isPushScanComplete,
  isTransientSyncError,
  nextPushCursor,
  orderEligibleTokens,
  resolvePullMode,
  resolveSyncStatus,
} from "../../supabase/functions/_shared/calendarSyncPaging";
import {
  bootstrapProgressLabel,
  isBootstrapInProgress,
  resolveStatusKey,
  statusLabel,
} from "@/lib/googleCalendarConnection";

const fn = (p: string) => readFileSync(resolve(process.cwd(), "supabase/functions", p), "utf8");

describe("pull mode resolution", () => {
  it("bootstraps a fresh connection", () => {
    expect(resolvePullMode({})).toBe("bootstrap");
  });
  it("resumes bootstrap when a page token is pending", () => {
    expect(resolvePullMode({ sync_token: "s", bootstrap_completed_at: "x", bootstrap_page_token: "p" })).toBe("bootstrap");
  });
  it("goes incremental only after a completed bootstrap with a sync token", () => {
    expect(resolvePullMode({ sync_token: "s", bootstrap_completed_at: "2026-01-01" })).toBe("incremental");
    expect(resolvePullMode({ sync_token: "s" })).toBe("bootstrap");
    expect(resolvePullMode({ bootstrap_completed_at: "2026-01-01" })).toBe("bootstrap");
  });
});

describe("events.list URL", () => {
  it("bootstrap uses the -30/+730 window, singleEvents and showDeleted", () => {
    const url = buildEventsListUrl({ windowStart: "2026-01-01T00:00:00Z", windowEnd: "2028-01-01T00:00:00Z" });
    expect(url).toContain("singleEvents=true");
    expect(url).toContain("showDeleted=true");
    expect(url).toContain("timeMin=2026-01-01");
    expect(url).toContain("timeMax=2028-01-01");
    expect(url).toContain("orderBy=startTime");
  });

  it("carries the resumed pageToken", () => {
    const url = buildEventsListUrl({ windowStart: "a", windowEnd: "b", pageToken: "tok/en+1" });
    expect(url).toContain(`pageToken=${encodeURIComponent("tok/en+1")}`);
  });

  it("incremental never sends params incompatible with syncToken", () => {
    const url = buildEventsListUrl({ windowStart: "a", windowEnd: "b", syncToken: "sync-1" });
    expect(url).toContain("syncToken=sync-1");
    expect(url).not.toContain("timeMin");
    expect(url).not.toContain("timeMax");
    expect(url).not.toContain("orderBy");
    expect(url).toContain("showDeleted=true");
  });
});

describe("per-run budget", () => {
  it("stops on page or item limit", () => {
    const limits = { maxPages: 3, maxItems: 500, maxPushItems: 100 };
    expect(isBudgetExhausted({ pages: 2, items: 10 }, limits)).toBe(false);
    expect(isBudgetExhausted({ pages: 3, items: 10 }, limits)).toBe(true);
    expect(isBudgetExhausted({ pages: 1, items: 500 }, limits)).toBe(true);
  });

  it("limits are configurable and clamped", () => {
    expect(getPagingLimits({}).maxPages).toBe(DEFAULT_PAGING_LIMITS.maxPages);
    expect(getPagingLimits({ GCAL_MAX_PAGES_PER_RUN: "9" }).maxPages).toBe(9);
    expect(getPagingLimits({ GCAL_MAX_PAGES_PER_RUN: "9999" }).maxPages).toBe(40);
    expect(getPagingLimits({ GCAL_MAX_PAGES_PER_RUN: "-1" }).maxPages).toBe(DEFAULT_PAGING_LIMITS.maxPages);
  });
});

describe("bootstrap progress persistence", () => {
  it("persists the next pageToken and keeps the bootstrap open", () => {
    const upd = computeBootstrapUpdate({
      nextPageToken: "page-2",
      nextSyncToken: "should-be-ignored",
      pagesDone: 6,
      itemsDone: 1200,
      windowStart: "w0",
      windowEnd: "w1",
      now: "2026-08-10T00:00:00.000Z",
    });
    expect(upd.bootstrap_page_token).toBe("page-2");
    expect(upd.bootstrap_completed_at).toBeNull();
    expect(upd.sync_token).toBeUndefined();
    expect(upd.bootstrap_pages_done).toBe(6);
    expect(upd.bootstrap_items_done).toBe(1200);
  });

  it("persists nextSyncToken only on the last page", () => {
    const upd = computeBootstrapUpdate({
      nextPageToken: null,
      nextSyncToken: "sync-final",
      pagesDone: 12,
      itemsDone: 2400,
      windowStart: "w0",
      windowEnd: "w1",
      now: "2026-08-10T00:00:00.000Z",
    });
    expect(upd.sync_token).toBe("sync-final");
    expect(upd.bootstrap_page_token).toBeNull();
    expect(upd.bootstrap_completed_at).toBe("2026-08-10T00:00:00.000Z");
  });

  it("keeps the original bootstrap_started_at across resumes", () => {
    const upd = computeBootstrapUpdate({
      nextPageToken: "p2",
      pagesDone: 1,
      itemsDone: 250,
      windowStart: "w0",
      windowEnd: "w1",
      startedAt: "2026-08-01T00:00:00.000Z",
    });
    expect(upd.bootstrap_started_at).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("incremental paging", () => {
  it("keeps the current sync token while pages remain", () => {
    const upd = computeIncrementalUpdate({ nextPageToken: "p2", nextSyncToken: "new", currentSyncToken: "old" });
    expect(upd.sync_token).toBe("old");
  });
  it("adopts nextSyncToken when paging ends", () => {
    const upd = computeIncrementalUpdate({ nextPageToken: null, nextSyncToken: "new", currentSyncToken: "old" });
    expect(upd.sync_token).toBe("new");
  });
  it("does not clear the token when Google returns none", () => {
    expect(computeIncrementalUpdate({ currentSyncToken: "old" })).toEqual({});
  });
});

describe("410 recovery is non-destructive", () => {
  it("clears only cursors and restarts the bootstrap", () => {
    expect(isCursorGoneStatus(410)).toBe(true);
    expect(isCursorGoneStatus(404)).toBe(false);
    const upd = computeCursorResetUpdate("2026-08-10T00:00:00.000Z");
    expect(upd.sync_token).toBeNull();
    expect(upd.bootstrap_page_token).toBeNull();
    expect(upd.bootstrap_completed_at).toBeNull();
    expect(upd.bootstrap_started_at).toBe("2026-08-10T00:00:00.000Z");
    // No event/mapping deletion keys whatsoever.
    expect(Object.keys(upd).some((k) => /delete|remove|events|mapping/.test(k))).toBe(false);
  });

  it("the sync function never deletes events or mappings on cursor reset", () => {
    const src = fn("google-calendar-sync/index.ts");
    const resetBlock = src.slice(src.indexOf("isCursorGoneStatus(pageRes.status)"), src.indexOf("if (!pageRes.ok)"));
    expect(resetBlock).toContain("cursorReset = true");
    expect(resetBlock).not.toContain(".delete()");
  });
});

describe("sync status never over-claims", () => {
  it("reports bootstrap while pages remain", () => {
    expect(resolveSyncStatus({ bootstrapInProgress: true, errors: 0 })).toBe("bootstrap");
    expect(resolveSyncStatus({ bootstrapInProgress: false, errors: 0 })).toBe("synced");
    expect(resolveSyncStatus({ bootstrapInProgress: true, errors: 2 })).toBe("error");
  });

  it("UI shows initial-sync progress instead of 'Sincronizado'", () => {
    const status = { connected: true, bootstrap_in_progress: true, bootstrap_pages_done: 6, bootstrap_items_done: 1500, last_sync_at: "2026-08-10T00:00:00Z" };
    expect(isBootstrapInProgress(status)).toBe(true);
    expect(resolveStatusKey(status, false)).toBe("bootstrap");
    expect(statusLabel("bootstrap")).toBe("Sincronização inicial em andamento");
    expect(bootstrapProgressLabel(status)).toContain("1500 eventos em 6 páginas");
  });

  it("keeps the reconnect_required UI from Block 1", () => {
    expect(resolveStatusKey({ connected: true, connection_state: "reconnect_required", bootstrap_in_progress: true }, false)).toBe("reconnect_required");
  });
});

describe("transient failures never require reconnect", () => {
  it("classifies aborts and timeouts as transient", () => {
    expect(isTransientSyncError(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(true);
    expect(isTransientSyncError(new Error("The operation timed out"))).toBe(true);
    expect(isTransientSyncError(new Error("invalid_grant"))).toBe(false);
  });

  it("a transient token refresh releases the lock without reconnect_required", () => {
    const src = fn("google-calendar-sync/index.ts");
    const block = src.slice(src.indexOf('if (tokenAttempt === "transient")'), src.indexOf('let accessToken: string | null'));
    expect(block).toContain('releaseLock("error"');
    expect(block).not.toContain("markReconnectRequired");
  });

  it("the lock is always released through a finally guard", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toMatch(/} finally \{\s*if \(!lockReleased\)/);
    expect(src).toContain("const lockCutoff = new Date(Date.now() - 5 * 60_000)"); // stale-lock recovery kept
  });
});

describe("local push scan is incremental with a stable composite cursor", () => {
  it("advances the cursor to the last processed row", () => {
    const rows = [
      { id: "a", updated_at: "2026-01-01T00:00:00Z" },
      { id: "b", updated_at: "2026-01-02T00:00:00Z" },
    ];
    expect(nextPushCursor(rows, { updated_at: null, event_id: null })).toEqual({
      updated_at: "2026-01-02T00:00:00Z",
      event_id: "b",
    });
  });

  it("keeps the previous cursor when nothing was processed", () => {
    const prev = { updated_at: "2026-01-02T00:00:00Z", event_id: "b" };
    expect(nextPushCursor([], prev)).toBe(prev);
  });

  it("detects the end of the scan only on a partial batch", () => {
    expect(isPushScanComplete(300, 300)).toBe(false);
    expect(isPushScanComplete(120, 300)).toBe(true);
  });

  it("the sync function no longer scans every mapping/event before the pull", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).not.toMatch(/from\("google_calendar_sync"\)\s*\.select\("\*"\)\s*\.eq\("user_id", userId\);/);
    expect(src).toContain('.in("agency_event_id", batchEventIds)');
    expect(src).toContain('.order("updated_at", { ascending: true })');
    expect(src).toContain(".limit(limits.maxPushItems)");
    expect(src).not.toContain(".range(");
  });

  it("reports the batch progress instead of a silent cap", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).not.toContain("pull-page-cap");
    for (const field of ["bootstrap_in_progress:", "pages_this_run:", "items_this_run:", "resume_pending:", "push_scan_complete:"]) {
      expect(src).toContain(field);
    }
  });
});

describe("large-account simulation over the per-run limit", () => {
  it("walks every page across runs without loss or duplication", () => {
    const limits = { maxPages: 3, maxItems: 10_000, maxPushItems: 300 };
    // 10 pages x 250 events = 2500 events, well above one run's page budget.
    const pages = Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 250 }, (_, j) => `evt-${i * 250 + j}`),
    );
    const seen: string[] = [];
    let state: Record<string, any> = {};
    let runs = 0;

    while (resolvePullMode(state) === "bootstrap" && runs < 20) {
      runs++;
      let cursor = state.bootstrap_page_token ? Number(state.bootstrap_page_token) : 0;
      let pagesThisRun = 0;
      let itemsThisRun = 0;
      let pending: string | null = null;
      let nextSyncToken: string | null = null;
      while (true) {
        seen.push(...pages[cursor]);
        pagesThisRun++;
        itemsThisRun += pages[cursor].length;
        const hasNext = cursor + 1 < pages.length;
        nextSyncToken = hasNext ? null : "sync-final";
        if (!hasNext) break;
        cursor++;
        if (isBudgetExhausted({ pages: pagesThisRun, items: itemsThisRun }, limits)) {
          pending = String(cursor);
          break;
        }
      }
      state = {
        ...state,
        ...computeBootstrapUpdate({
          nextPageToken: pending,
          nextSyncToken,
          pagesDone: (state.bootstrap_pages_done || 0) + pagesThisRun,
          itemsDone: (state.bootstrap_items_done || 0) + itemsThisRun,
          windowStart: "w0",
          windowEnd: "w1",
          startedAt: state.bootstrap_started_at,
        }),
      };
    }

    expect(runs).toBeGreaterThan(1);
    expect(seen).toHaveLength(2500);
    expect(new Set(seen).size).toBe(2500);
    expect(state.sync_token).toBe("sync-final");
    expect(state.bootstrap_page_token).toBeNull();
    expect(state.bootstrap_items_done).toBe(2500);
    expect(resolvePullMode(state)).toBe("incremental");
  });
});

describe("cron fairness and budget", () => {
  it("orders never-synced first, then the oldest last_sync_at", () => {
    const ordered = orderEligibleTokens([
      { user_id: "recent", last_sync_at: "2026-08-10T12:00:00Z" },
      { user_id: "never", last_sync_at: null },
      { user_id: "old", last_sync_at: "2026-08-01T12:00:00Z" },
    ]);
    expect(ordered.map((t) => t.user_id)).toEqual(["never", "old", "recent"]);
  });

  it("the heavy account rotates to the back once it is synced", () => {
    const heavy = { user_id: "heavy", last_sync_at: "2026-08-10T12:00:05Z" };
    const others = [
      { user_id: "a", last_sync_at: "2026-08-10T11:00:00Z" },
      { user_id: "b", last_sync_at: "2026-08-10T10:00:00Z" },
    ];
    expect(orderEligibleTokens([heavy, ...others]).map((t) => t.user_id)).toEqual(["b", "a", "heavy"]);
  });

  it("stops dispatching when the run budget or user cap is reached", () => {
    const budget = getCronBudget({ GCAL_CRON_TOTAL_MS: "30000", GCAL_CRON_PER_USER_MS: "10000", GCAL_CRON_MAX_USERS: "3" });
    expect(hasCronBudgetLeft(0, 0, budget)).toBe(true);
    expect(hasCronBudgetLeft(29_000, 1, budget)).toBe(false);
    expect(hasCronBudgetLeft(1_000, 3, budget)).toBe(false);
  });

  it("cron aborts per user, continues afterwards and stays aggregated/fail-closed", () => {
    const src = fn("google-calendar-cron/index.ts");
    expect(src).toContain("new AbortController()");
    expect(src).toContain("signal: controller.signal");
    expect(src).toContain("orderEligibleTokens(eligible)");
    expect(src).toContain("hasCronBudgetLeft(");
    expect(src).toContain("isAuthorizedInternalCall(presentedSecret, expectedSecret)");
    // Aggregated logs/response only — user ids exist solely in the sync request body.
    expect(src).not.toMatch(/console\.(log|warn|error)\([^)]*user_id/);
    const response = src.slice(src.indexOf("JSON.stringify({\n      success: true"));
    expect(response).not.toContain("user_id");
  });
});