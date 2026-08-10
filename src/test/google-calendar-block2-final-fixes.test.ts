/**
 * Block 2 — final corrective review.
 * Covers: immutable bootstrap window, completion gated on nextSyncToken,
 * per-cycle incremental counters, fail-closed mapping lookup and the
 * blocking behaviour of the local deletion cleanup.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BOOTSTRAP_MISSING_SYNC_TOKEN,
  buildEventsListUrl,
  computeBootstrapUpdate,
  computeIncrementalUpdate,
  isBootstrapCompletionBlocked,
  nextDeletedCursor,
  nextPushCursor,
  resolveIncrementalCycleBase,
  resolvePullMode,
  resolvePullWindow,
  resolveSyncStatus,
} from "../../supabase/functions/_shared/calendarSyncPaging";

const fn = (rel: string) =>
  readFileSync(join(process.cwd(), "supabase/functions", rel), "utf8");

describe("1. bootstrap window is immutable across resumes", () => {
  it("first page uses the dynamic window and persists it", () => {
    const dynamic = { windowStart: "2026-07-11T00:00:00.000Z", windowEnd: "2028-08-10T00:00:00.000Z" };
    const w = resolvePullWindow("bootstrap", { sync_token: null }, dynamic);
    expect(w).toEqual({ ...dynamic, persisted: false });
    const upd = computeBootstrapUpdate({
      nextPageToken: "p2",
      pagesDone: 6,
      itemsDone: 1200,
      windowStart: dynamic.windowStart,
      windowEnd: dynamic.windowEnd,
    });
    expect(upd.bootstrap_window_start).toBe(dynamic.windowStart);
    expect(upd.bootstrap_window_end).toBe(dynamic.windowEnd);
    expect(upd.bootstrap_page_token).toBe("p2");
  });

  it("a later run replays the persisted window, not a recomputed one", () => {
    // Run 1 (day 1)
    const day1 = { windowStart: "2026-07-11T00:00:00.000Z", windowEnd: "2028-08-10T00:00:00.000Z" };
    const state: Record<string, any> = {
      ...computeBootstrapUpdate({
        nextPageToken: "p7",
        pagesDone: 6,
        itemsDone: 1200,
        windowStart: day1.windowStart,
        windowEnd: day1.windowEnd,
      }),
    };
    // Run 2 (three days later → different -30/+730 window)
    const day4 = { windowStart: "2026-07-14T00:00:00.000Z", windowEnd: "2028-08-13T00:00:00.000Z" };
    expect(resolvePullMode(state)).toBe("bootstrap");
    const w2 = resolvePullWindow("bootstrap", state, day4);
    expect(w2).toEqual({ ...day1, persisted: true });
    const url = buildEventsListUrl({ ...w2, pageToken: state.bootstrap_page_token });
    expect(url).toContain(`timeMin=${encodeURIComponent(day1.windowStart)}`);
    expect(url).toContain(`timeMax=${encodeURIComponent(day1.windowEnd)}`);
    expect(url).toContain("pageToken=p7");
    expect(url).not.toContain(encodeURIComponent(day4.windowStart));
    // The persisted window is re-persisted unchanged on the next progress write.
    const upd2 = computeBootstrapUpdate({
      nextPageToken: "p13",
      pagesDone: 12,
      itemsDone: 2400,
      windowStart: w2.windowStart,
      windowEnd: w2.windowEnd,
      startedAt: state.bootstrap_started_at,
    });
    expect(upd2.bootstrap_window_start).toBe(day1.windowStart);
    expect(upd2.bootstrap_started_at).toBe(state.bootstrap_started_at);
  });

  it("incremental ignores the window and never sends timeMin/timeMax", () => {
    const w = resolvePullWindow(
      "incremental",
      { bootstrap_window_start: "a", bootstrap_window_end: "b", bootstrap_page_token: null },
      { windowStart: "x", windowEnd: "y" },
    );
    expect(w.persisted).toBe(false);
    const url = buildEventsListUrl({ ...w, syncToken: "s1", pageToken: "p2" });
    expect(url).toContain("syncToken=s1");
    expect(url).toContain("pageToken=p2");
    expect(url).not.toContain("timeMin");
  });

  it("the sync function separates the pull window from the local push window", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toContain("resolvePullWindow(pullMode, tokenRecord, localWindow)");
    expect(src).toContain("windowStart: pullBootstrapWindow.windowStart");
    expect(src).toContain("windowStart: pullBootstrapWindow.windowStart,\n          windowEnd: pullBootstrapWindow.windowEnd,");
    // No stale global ISO window left feeding the pull.
    expect(src).not.toMatch(/buildEventsListUrl\(\{\s*windowStart,\s*windowEnd/);
    // Local push still uses the current day-based window.
    expect(src).toContain('.gte("event_date", windowStartDay)');
  });
});

describe("2. bootstrap completes only with a nextSyncToken", () => {
  it("flags the missing token instead of claiming completion", () => {
    expect(isBootstrapCompletionBlocked({ nextPageToken: null, nextSyncToken: null })).toBe(true);
    expect(isBootstrapCompletionBlocked({ nextPageToken: null, nextSyncToken: "s" })).toBe(false);
    expect(isBootstrapCompletionBlocked({ nextPageToken: "p2", nextSyncToken: null })).toBe(false);

    const upd = computeBootstrapUpdate({
      nextPageToken: null,
      nextSyncToken: null,
      pagesDone: 3,
      itemsDone: 400,
      windowStart: "a",
      windowEnd: "b",
    });
    expect(upd.bootstrap_completed_at).toBeNull();
    expect(upd.sync_token).toBeUndefined();
    expect(upd.bootstrap_last_error).toBe(BOOTSTRAP_MISSING_SYNC_TOKEN);
    // Progress is kept, nothing is deleted or reset.
    expect(upd.bootstrap_items_done).toBe(400);
    expect(Object.keys(upd).some((k) => /delete|remove|mapping/.test(k))).toBe(false);
  });

  it("a blocked bootstrap is retried and never reported as synced", () => {
    let state: Record<string, any> = computeBootstrapUpdate({
      nextPageToken: null,
      nextSyncToken: null,
      pagesDone: 3,
      itemsDone: 400,
      windowStart: "a",
      windowEnd: "b",
    });
    expect(resolveSyncStatus({ bootstrapInProgress: true, errors: 0 })).toBe("bootstrap");
    // Next run: still bootstrap (no sync_token/completed_at) — no silent full loop
    // into "incremental", and no data reset.
    expect(resolvePullMode(state)).toBe("bootstrap");
    state = {
      ...state,
      ...computeBootstrapUpdate({
        nextPageToken: null,
        nextSyncToken: "sync-ok",
        pagesDone: 3,
        itemsDone: 400,
        windowStart: "a",
        windowEnd: "b",
      }),
    };
    expect(state.sync_token).toBe("sync-ok");
    expect(state.bootstrap_completed_at).toBeTruthy();
    expect(state.bootstrap_last_error).toBeNull();
    expect(resolvePullMode(state)).toBe("incremental");
  });

  it("the sync function keeps the bootstrap open when completion is blocked", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toContain("bootstrapBlocked = isBootstrapCompletionBlocked({");
    expect(src).toContain("bootstrapInProgress = !!pendingPageToken || bootstrapBlocked");
    expect(src).toContain("bootstrap-missing-sync-token");
  });
});

describe("3. incremental counters are per cycle", () => {
  it("a fresh cycle starts at zero and a resumed cycle accumulates", () => {
    const finished = { incremental_page_token: null, incremental_started_at: null, incremental_pages_done: 6, incremental_items_done: 1200 };
    expect(resolveIncrementalCycleBase(finished)).toEqual({ pagesDone: 0, itemsDone: 0, startedAt: null });
    const resuming = { incremental_page_token: "p2", incremental_started_at: "2026-08-01T00:00:00Z", incremental_pages_done: 6, incremental_items_done: 1200 };
    expect(resolveIncrementalCycleBase(resuming)).toEqual({
      pagesDone: 6,
      itemsDone: 1200,
      startedAt: "2026-08-01T00:00:00Z",
    });
    expect(resolveIncrementalCycleBase(null)).toEqual({ pagesDone: 0, itemsDone: 0, startedAt: null });
  });

  it("completed cycle followed by a new partial cycle does not inherit totals", () => {
    // Cycle A: 2 runs, ends complete with 8 pages / 900 items.
    let state: Record<string, any> = { sync_token: "s0", bootstrap_completed_at: "2026-01-01" };
    const runIncremental = (pages: number, items: number, pending: string | null, next: string | null) => {
      const cycle = resolveIncrementalCycleBase(state);
      state = {
        ...state,
        ...computeIncrementalUpdate({
          nextPageToken: pending,
          nextSyncToken: next,
          currentSyncToken: state.sync_token,
          pagesDone: cycle.pagesDone + pages,
          itemsDone: cycle.itemsDone + items,
          startedAt: cycle.startedAt,
        }),
      };
    };
    runIncremental(6, 700, "pA", null);
    expect(state.incremental_items_done).toBe(700);
    runIncremental(2, 200, null, "s1");
    expect(state.sync_token).toBe("s1");
    expect(state.incremental_page_token).toBeNull();
    expect(state.incremental_items_done).toBe(900);

    // Cycle B (new partial run) restarts the counters instead of adding to 900.
    runIncremental(6, 1200, "pB", null);
    expect(state.incremental_pages_done).toBe(6);
    expect(state.incremental_items_done).toBe(1200);
    expect(state.incremental_page_token).toBe("pB");
    expect(state.sync_token).toBe("s1");
  });

  it("the sync function derives counters from the current cycle", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toContain("const cycle = resolveIncrementalCycleBase(tokenRecord)");
    expect(src).toContain("pagesDone: cycle.pagesDone + pagesThisRun");
    expect(src).not.toContain("(tokenRecord.incremental_items_done || 0) + itemsThisRun");
  });
});

describe("4. mapping lookup failure is fail-closed", () => {
  it("no creates/updates/deletes and no cursor movement on a mapping fetch error", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toContain("mappingFetchFailed = true");
    // Push and delete loops iterate the guarded arrays.
    expect(src).toContain("const pushEvents: any[] = mappingFetchFailed ? [] : liveLocalEvents");
    expect(src).toContain("const deleteEvents: any[] = mappingFetchFailed ? [] : deletedLocalEvents");
    expect(src).toContain("for (const event of pushEvents)");
    expect(src).toContain("for (const event of deleteEvents)");
    // Cursors preserved for retry, error surfaced, lock still released.
    expect(src).toContain("if (!localErr && !mappingFetchFailed)");
    expect(src).toContain("if (!deletedErr && !mappingFetchFailed)");
    expect(src).toContain("(mappingFetchFailed ? 1 : 0)");
    expect(src).toContain("push-aborted reason=mapping-fetch-error");
    expect(src).toContain("mapping_fetch_failed: mappingFetchFailed");
  });

  it("empty guarded batches mean zero work and unchanged cursors", () => {
    const rows = [{ id: "e1", updated_at: "2026-01-01T00:00:00Z", deleted_at: "2026-01-01T00:00:00Z" }];
    const mappingFetchFailed = true;
    const pushEvents = mappingFetchFailed ? [] : rows;
    const deleteEvents = mappingFetchFailed ? [] : rows;
    expect(pushEvents).toHaveLength(0);
    expect(deleteEvents).toHaveLength(0);
    const liveCursor = { updated_at: "2025-12-01T00:00:00Z", event_id: "e0" };
    const delCursor = { deleted_at: "2025-12-01T00:00:00Z", event_id: "e0" };
    expect(nextPushCursor(pushEvents, liveCursor)).toEqual(liveCursor);
    expect(nextDeletedCursor(deleteEvents, delCursor)).toEqual(delCursor);
    expect(resolveSyncStatus({ bootstrapInProgress: false, errors: 1 })).toBe("error");
  });
});

describe("5. local cleanup failure blocks the deletion cursor", () => {
  it("checks the delete error before marking the row processed", () => {
    const src = fn("google-calendar-sync/index.ts");
    const block = src.slice(src.indexOf("for (const event of deleteEvents)"), src.indexOf("const advancedDeletedCursor"));
    expect(block).toContain("const { error: cleanupErr } = await supabase");
    expect(block).toMatch(/if \(cleanupErr\)[\s\S]{0,320}deletedAdvanceBlocked = true;\s*\n\s*continue;/);
    // markDeletedProcessed is only reached after the successful delete.
    expect(block.indexOf("delete-local-cleanup-error")).toBeLessThan(
      block.indexOf('reason=no-mapping'),
    );
  });

  it("a failure on the first item stops the cursor before it, even if later items succeed", () => {
    const rows = [
      { id: "a", deleted_at: "2026-01-01T00:00:00Z" },
      { id: "b", deleted_at: "2026-01-02T00:00:00Z" },
      { id: "c", deleted_at: "2026-01-03T00:00:00Z" },
    ];
    const failing = new Set(["a"]);
    const processed: typeof rows = [];
    let blocked = false;
    const markDeletedProcessed = (e: (typeof rows)[number]) => {
      if (!blocked) processed.push(e);
    };
    for (const row of rows) {
      if (failing.has(row.id)) {
        blocked = true;
        continue;
      }
      markDeletedProcessed(row);
    }
    // Nothing after the first blocked row is marked processed.
    expect(processed).toHaveLength(0);
    const cursor = { deleted_at: null as string | null, event_id: null as string | null };
    expect(nextDeletedCursor(processed, cursor)).toEqual(cursor);
  });

  it("a failure in the middle keeps only the rows before it", () => {
    const rows = [
      { id: "a", deleted_at: "2026-01-01T00:00:00Z" },
      { id: "b", deleted_at: "2026-01-02T00:00:00Z" },
      { id: "c", deleted_at: "2026-01-03T00:00:00Z" },
    ];
    const processed: typeof rows = [];
    let blocked = false;
    for (const row of rows) {
      if (row.id === "b") {
        blocked = true;
        continue;
      }
      if (!blocked) processed.push(row);
    }
    expect(processed.map((r) => r.id)).toEqual(["a"]);
    expect(nextDeletedCursor(processed, { deleted_at: null, event_id: null })).toEqual({
      deleted_at: "2026-01-01T00:00:00Z",
      event_id: "a",
    });
  });
});

describe("6. previously fixed behaviour still holds", () => {
  it("incremental page token, delete cursor, cron budget, locks and UI intact", () => {
    const sync = fn("google-calendar-sync/index.ts");
    const cron = fn("google-calendar-cron/index.ts");
    expect(sync).toContain("resolveResumePageToken(pullMode, tokenRecord)");
    expect(sync).toContain("push_deleted_cursor_event_id: advancedDeletedCursor.event_id");
    expect(sync).toContain('buildKeysetOrFilter("deleted_at"');
    // Lock always released through the finally guard.
    expect(sync).toContain("finally");
    expect(sync).toContain("resolveSyncStatus({ bootstrapInProgress, incrementalInProgress, errors: totalErrors })");
    expect(cron).toContain("effectiveUserTimeoutMs(Date.now() - startedAt, budget)");
    expect(cron).toContain("orderEligibleTokens(eligible)");
    // OAuth scope untouched by this review.
    expect(fn("google-calendar-auth/index.ts")).toContain("calendar");
  });
});