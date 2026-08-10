/**
 * Regression: a transient Google push failure (quota/rate limit/5xx) must
 * freeze the local push cursor so the affected events are retried, instead of
 * being silently skipped for the rest of the scan cycle.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isTransientPushFailure,
  nextPushCursor,
} from "../../supabase/functions/_shared/calendarSyncPaging";

const syncSource = readFileSync(
  join(process.cwd(), "supabase/functions/google-calendar-sync/index.ts"),
  "utf8",
);

const quotaBody = JSON.stringify({
  error: { errors: [{ domain: "usageLimits", reason: "quotaExceeded" }], code: 403 },
});

describe("isTransientPushFailure", () => {
  it("treats 403 quotaExceeded as transient", () => {
    expect(isTransientPushFailure(403, quotaBody)).toBe(true);
  });

  it("treats 429 and 5xx as transient", () => {
    expect(isTransientPushFailure(429)).toBe(true);
    expect(isTransientPushFailure(500)).toBe(true);
    expect(isTransientPushFailure(503)).toBe(true);
  });

  it("treats payload/permission rejections as permanent", () => {
    expect(isTransientPushFailure(400, "invalid start time")).toBe(false);
    expect(isTransientPushFailure(404, "not found")).toBe(false);
    expect(
      isTransientPushFailure(403, JSON.stringify({ error: { errors: [{ reason: "forbiddenForServiceAccounts" }] } })),
    ).toBe(false);
  });
});

describe("push cursor freeze", () => {
  const rows = [
    { id: "a", updated_at: "2026-08-01T00:00:00.000Z" },
    { id: "b", updated_at: "2026-08-02T00:00:00.000Z" },
    { id: "c", updated_at: "2026-08-03T00:00:00.000Z" },
  ];

  it("advances only over rows processed before the transient failure", () => {
    const blockedIndex = 1;
    const cursor = nextPushCursor(rows.slice(0, blockedIndex), {
      updated_at: null,
      event_id: null,
    });
    expect(cursor).toEqual({ updated_at: rows[0].updated_at, event_id: "a" });
  });

  it("keeps the previous cursor when the very first push fails", () => {
    const previous = { updated_at: "2026-07-01T00:00:00.000Z", event_id: "z" };
    expect(nextPushCursor(rows.slice(0, 0), previous)).toEqual(previous);
  });
});

describe("sync function wiring", () => {
  it("computes the cursor from processed events only", () => {
    expect(syncSource).toContain("pushBlockedIndex === null ? pushEvents : pushEvents.slice(0, pushBlockedIndex)");
    expect(syncSource).not.toContain("nextPushCursor(pushEvents, pushCursor)");
  });

  it("never marks the push scan complete while blocked", () => {
    expect(syncSource).toContain("pushScanComplete && !pushAdvanceBlocked");
  });

  it("classifies push failures with the shared helper", () => {
    expect(syncSource).toContain("isTransientPushFailure(res.status, errText)");
  });
});