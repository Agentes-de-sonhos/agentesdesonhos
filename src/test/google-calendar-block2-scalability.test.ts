import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildEventsListUrl,
  buildKeysetOrFilter,
  computeBootstrapUpdate,
  computeCursorResetUpdate,
  computeIncrementalUpdate,
  CRON_MIN_SLICE_MS,
  CRON_SAFETY_MARGIN_MS,
  DEFAULT_PAGING_LIMITS,
  effectiveUserTimeoutMs,
  getCronBudget,
  getPagingLimits,
  hasCronBudgetLeft,
  isBudgetExhausted,
  isCursorGoneStatus,
  isIncrementalInProgress,
  isPushScanComplete,
  isTransientSyncError,
  nextDeletedCursor,
  nextPushCursor,
  orderEligibleTokens,
  resolvePullMode,
  resolveResumePageToken,
  resolveSyncStatus,
} from "../../supabase/functions/_shared/calendarSyncPaging";
import {
  bootstrapProgressLabel,
  isBootstrapInProgress,
  isIncrementalInProgress as uiIncrementalInProgress,
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

describe("incremental paging is resumable", () => {
  it("persists the pending pageToken and keeps the base sync token", () => {
    const upd = computeIncrementalUpdate({
      nextPageToken: "p2",
      nextSyncToken: "new",
      currentSyncToken: "old",
      pagesDone: 6,
      itemsDone: 1200,
      now: "2026-08-10T00:00:00.000Z",
    });
    expect(upd.sync_token).toBe("old");
    expect(upd.incremental_page_token).toBe("p2");
    expect(upd.incremental_started_at).toBe("2026-08-10T00:00:00.000Z");
    expect(upd.incremental_pages_done).toBe(6);
    expect(upd.incremental_items_done).toBe(1200);
  });

  it("clears the page token and adopts nextSyncToken on the last page", () => {
    const upd = computeIncrementalUpdate({ nextPageToken: null, nextSyncToken: "new", currentSyncToken: "old" });
    expect(upd.sync_token).toBe("new");
    expect(upd.incremental_page_token).toBeNull();
    expect(upd.incremental_started_at).toBeNull();
  });

  it("never clears the base token when Google returns none", () => {
    const upd = computeIncrementalUpdate({ currentSyncToken: "old" });
    expect(upd).not.toHaveProperty("sync_token");
    expect(upd.incremental_page_token).toBeNull();
  });

  it("keeps the original incremental_started_at across resumes", () => {
    const upd = computeIncrementalUpdate({
      nextPageToken: "p3",
      currentSyncToken: "old",
      startedAt: "2026-08-01T00:00:00.000Z",
    });
    expect(upd.incremental_started_at).toBe("2026-08-01T00:00:00.000Z");
  });

  it("resumes each mode from its own persisted token", () => {
    const state = { incremental_page_token: "inc-2", bootstrap_page_token: "boot-2", sync_token: "s", bootstrap_completed_at: "x" };
    expect(resolveResumePageToken("incremental", state)).toBe("inc-2");
    expect(resolveResumePageToken("bootstrap", state)).toBe("boot-2");
    expect(resolveResumePageToken("incremental", {})).toBeNull();
    expect(isIncrementalInProgress(state)).toBe(true);
    expect(isIncrementalInProgress({})).toBe(false);
  });

  it("the sync function resumes incremental pages instead of restarting page 1", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toContain("resolveResumePageToken(pullMode, tokenRecord)");
    expect(src).not.toMatch(/pullMode === "bootstrap" \? \(tokenRecord\.bootstrap_page_token \?\? null\) : null/);
    expect(src).toContain("incremental_page_token");
    expect(src).toContain("incrementalInProgress");
  });
});

describe("incremental over the per-run limit", () => {
  it("walks every page across runs and ends with the new nextSyncToken", () => {
    const limits = { maxPages: 2, maxItems: 10_000, maxPushItems: 300 };
    const pages = Array.from({ length: 7 }, (_, i) =>
      Array.from({ length: 120 }, (_, j) => `chg-${i * 120 + j}`),
    );
    let state: Record<string, any> = { sync_token: "sync-base", bootstrap_completed_at: "2026-01-01" };
    const seen: string[] = [];
    let runs = 0;

    while (runs < 20) {
      runs++;
      expect(resolvePullMode(state)).toBe("incremental");
      const baseToken = state.sync_token;
      let cursor = state.incremental_page_token ? Number(state.incremental_page_token) : 0;
      let pagesThisRun = 0;
      let itemsThisRun = 0;
      let pending: string | null = null;
      let nextSyncToken: string | null = null;
      while (true) {
        // The base sync token must be the one used on every page of the walk.
        expect(baseToken).toBe("sync-base");
        seen.push(...pages[cursor]);
        pagesThisRun++;
        itemsThisRun += pages[cursor].length;
        const hasNext = cursor + 1 < pages.length;
        nextSyncToken = hasNext ? null : "sync-next";
        if (!hasNext) break;
        cursor++;
        if (isBudgetExhausted({ pages: pagesThisRun, items: itemsThisRun }, limits)) {
          pending = String(cursor);
          break;
        }
      }
      state = {
        ...state,
        ...computeIncrementalUpdate({
          nextPageToken: pending,
          nextSyncToken,
          currentSyncToken: state.sync_token,
          pagesDone: (state.incremental_pages_done || 0) + pagesThisRun,
          itemsDone: (state.incremental_items_done || 0) + itemsThisRun,
          startedAt: state.incremental_started_at,
        }),
      };
      if (!state.incremental_page_token) break;
    }

    expect(runs).toBeGreaterThan(1);
    expect(seen).toHaveLength(840);
    expect(new Set(seen).size).toBe(840);
    expect(state.sync_token).toBe("sync-next");
    expect(state.incremental_page_token).toBeNull();
    expect(state.incremental_items_done).toBe(840);
  });
});

describe("local deletion queue is resumable", () => {
  it("advances only over processed rows, with an id tiebreaker", () => {
    const rows = [
      { id: "11111111-1111-4111-8111-111111111111", deleted_at: "2026-01-01T00:00:00Z" },
      { id: "22222222-2222-4222-8222-222222222222", deleted_at: "2026-01-01T00:00:00Z" },
    ];
    expect(nextDeletedCursor(rows, { deleted_at: null, event_id: null })).toEqual({
      deleted_at: "2026-01-01T00:00:00Z",
      event_id: "22222222-2222-4222-8222-222222222222",
    });
    const prev = { deleted_at: "2026-01-01T00:00:00Z", event_id: "z" };
    expect(nextDeletedCursor([], prev)).toBe(prev);
    // A blocked row keeps the cursor behind it, so it is retried next run.
    expect(nextDeletedCursor([rows[0]], { deleted_at: null, event_id: null }).event_id).toBe(rows[0].id);
  });

  it("keyset filter compares (deleted_at, id) instead of an offset", () => {
    expect(buildKeysetOrFilter("deleted_at", "2026-01-01T00:00:00Z", "abc")).toBe(
      "deleted_at.gt.2026-01-01T00:00:00Z,and(deleted_at.eq.2026-01-01T00:00:00Z,id.gt.abc)",
    );
  });

  it("no starvation or duplication above the per-run limit with identical timestamps", () => {
    const limit = 3;
    const ts = "2026-05-05T10:00:00Z";
    const all = Array.from({ length: 10 }, (_, i) => ({
      id: `e${String(i).padStart(2, "0")}`,
      // Half share the exact same deleted_at, different UUID-like ids.
      deleted_at: i < 5 ? ts : `2026-05-05T11:0${i}:00Z`,
    }));
    const sorted = [...all].sort((a, b) =>
      a.deleted_at === b.deleted_at ? a.id.localeCompare(b.id) : a.deleted_at.localeCompare(b.deleted_at),
    );
    let cursor = { deleted_at: null as string | null, event_id: null as string | null };
    const processed: string[] = [];
    let runs = 0;
    while (runs < 10) {
      runs++;
      const batch = sorted
        .filter((r) =>
          !cursor.deleted_at
            ? true
            : r.deleted_at > cursor.deleted_at ||
              (r.deleted_at === cursor.deleted_at && r.id > (cursor.event_id as string)),
        )
        .slice(0, limit);
      if (!batch.length) break;
      processed.push(...batch.map((r) => r.id));
      cursor = nextDeletedCursor(batch, cursor);
      if (isPushScanComplete(batch.length, limit)) break;
    }
    expect(runs).toBeGreaterThan(1);
    expect(processed).toHaveLength(10);
    expect(new Set(processed).size).toBe(10);
  });

  it("the sync function pages deletions by cursor and preserves tombstones", () => {
    const src = fn("google-calendar-sync/index.ts");
    const block = src.slice(src.indexOf("const deletedCursor"), src.indexOf("const deletedLocalEvents"));
    expect(block).toContain('.order("deleted_at", { ascending: true })');
    expect(block).toContain('.order("id", { ascending: true })');
    expect(block).toContain('buildKeysetOrFilter("deleted_at"');
    expect(src).toContain("push_deleted_cursor_at: advancedDeletedCursor.deleted_at");
    expect(src).toContain("push_deleted_cursor_event_id: advancedDeletedCursor.event_id");
    expect(src).toContain("deletedAdvanceBlocked = true");
    // Tombstone behaviour unchanged: the deletion pass pushes to Google and
    // never introduces new local deletes beyond the two pre-existing rules.
    expect(src.match(/from\("agency_events"\)[\s\S]{0,40}?\.delete\(\)/g) || []).toHaveLength(2);
    expect(block).not.toContain(".delete()");
  });

  it("reports live and deleted scan progress separately", () => {
    const src = fn("google-calendar-sync/index.ts");
    for (const field of ["push_scan_complete:", "deleted_scan_complete:", "deleted_batch_size:", "deleted_processed:"]) {
      expect(src).toContain(field);
    }
  });
});

describe("410 recovery is non-destructive", () => {
  it("clears only cursors and restarts the bootstrap", () => {
    expect(isCursorGoneStatus(410)).toBe(true);
    expect(isCursorGoneStatus(404)).toBe(false);
    const upd = computeCursorResetUpdate("2026-08-10T00:00:00.000Z");
    expect(upd.sync_token).toBeNull();
    expect(upd.bootstrap_page_token).toBeNull();
    expect(upd.incremental_page_token).toBeNull();
    expect(upd.incremental_items_done).toBe(0);
    expect(upd.bootstrap_completed_at).toBeNull();
    expect(upd.bootstrap_started_at).toBe("2026-08-10T00:00:00.000Z");
    // No event/mapping deletion keys whatsoever.
    expect(Object.keys(upd).some((k) => /delete|remove|events|mapping/.test(k))).toBe(false);
  });

  it("cursors are reset only on a real 410", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toMatch(/if \(isCursorGoneStatus\(pageRes\.status\)\)/);
    expect(src).toMatch(/if \(cursorReset\) \{\s*(\/\/[^\n]*\n\s*)*progressColumns = computeCursorResetUpdate\(\);/);
    // Exactly one call site, guarded by the 410 branch.
    expect(src.match(/computeCursorResetUpdate\(/g) || []).toHaveLength(1);
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

  it("reports incremental while an incremental walk is pending", () => {
    expect(resolveSyncStatus({ bootstrapInProgress: false, incrementalInProgress: true, errors: 0 })).toBe("incremental");
    expect(resolveSyncStatus({ bootstrapInProgress: false, incrementalInProgress: false, errors: 0 })).toBe("synced");
    expect(resolveSyncStatus({ bootstrapInProgress: false, incrementalInProgress: true, errors: 1 })).toBe("error");
  });

  it("UI distinguishes a pending incremental walk from 'Sincronizado'", () => {
    const status = { connected: true, incremental_in_progress: true, incremental_pages_done: 2, incremental_items_done: 240, last_sync_at: "2026-08-10T00:00:00Z" };
    expect(uiIncrementalInProgress(status)).toBe(true);
    expect(resolveStatusKey(status, false)).toBe("incremental");
    expect(statusLabel("incremental")).toBe("Sincronização em andamento");
    expect(bootstrapProgressLabel(status)).toContain("240 eventos em 2 páginas");
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

  it("never starts a slice that would overrun the total budget", () => {
    const budget = getCronBudget({ GCAL_CRON_TOTAL_MS: "30000", GCAL_CRON_PER_USER_MS: "20000" });
    // 15s left: the slice is clamped instead of the full 20s.
    expect(effectiveUserTimeoutMs(15_000, budget)).toBe(15_000 - CRON_SAFETY_MARGIN_MS);
    expect(effectiveUserTimeoutMs(0, budget)).toBe(20_000);
    // No usable window left → no dispatch at all.
    expect(effectiveUserTimeoutMs(29_000, budget)).toBe(0);
    expect(hasCronBudgetLeft(29_000, 0, budget)).toBe(false);
    expect(effectiveUserTimeoutMs(30_000 - CRON_SAFETY_MARGIN_MS - CRON_MIN_SLICE_MS, budget)).toBe(CRON_MIN_SLICE_MS);
  });

  it("worst-case dispatch loop stays inside the total budget plus a small margin", () => {
    const budget = getCronBudget({ GCAL_CRON_TOTAL_MS: "55000", GCAL_CRON_PER_USER_MS: "20000", GCAL_CRON_MAX_USERS: "50" });
    let elapsed = 0;
    let dispatched = 0;
    // Every user times out, i.e. consumes its whole slice.
    while (hasCronBudgetLeft(elapsed, dispatched, budget)) {
      const slice = effectiveUserTimeoutMs(elapsed, budget);
      expect(slice).toBeGreaterThan(0);
      elapsed += slice;
      dispatched++;
    }
    expect(dispatched).toBeGreaterThan(1);
    expect(elapsed).toBeLessThanOrEqual(budget.totalMs);
    expect(budget.totalMs - elapsed).toBeLessThanOrEqual(CRON_SAFETY_MARGIN_MS + CRON_MIN_SLICE_MS);
  });

  it("cron aborts per user, continues afterwards and stays aggregated/fail-closed", () => {
    const src = fn("google-calendar-cron/index.ts");
    expect(src).toContain("new AbortController()");
    expect(src).toContain("signal: controller.signal");
    expect(src).toContain("effectiveUserTimeoutMs(Date.now() - startedAt, budget)");
    expect(src).toContain("setTimeout(() => controller.abort(), sliceMs)");
    expect(src).not.toContain("controller.abort(), budget.perUserMs");
    // An abort is counted as a timeout and never flags re-consent.
    expect(src).toContain('const aborted = e?.name === "AbortError"');
    expect(src).not.toContain("reconnect_required");
    expect(src).toContain("orderEligibleTokens(eligible)");
    expect(src).toContain("hasCronBudgetLeft(");
    expect(src).toContain("isAuthorizedInternalCall(presentedSecret, expectedSecret)");
    // Aggregated logs/response only — user ids exist solely in the sync request body.
    expect(src).not.toMatch(/console\.(log|warn|error)\([^)]*user_id/);
    const response = src.slice(src.indexOf("JSON.stringify({\n      success: true"));
    expect(response).not.toContain("user_id");
  });
});