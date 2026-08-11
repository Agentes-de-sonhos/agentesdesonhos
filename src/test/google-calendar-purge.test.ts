/**
 * Regression coverage for the authorized, title-scoped Google Calendar purge
 * and for the idempotency guard that prevents recreation loops.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bumpErrorSummary,
  buildPurgeScanUrl,
  classifyDeleteStatus,
  dedupeRemoteTargets,
  matchesPurgeTitle,
  PURGE_SCAN_QUERY,
  PURGE_TARGET_TITLES,
} from "../../supabase/functions/_shared/calendarPurge";
import {
  canCreateOnGoogle,
  isProviderOriginEvent,
} from "../../supabase/functions/_shared/calendarProvenance";

const purgeSource = readFileSync(
  join(process.cwd(), "supabase/functions/google-calendar-purge/index.ts"),
  "utf8",
);
const syncSource = readFileSync(
  join(process.cwd(), "supabase/functions/google-calendar-sync/index.ts"),
  "utf8",
);

describe("purge title scope", () => {
  it("covers exactly the four authorized titles", () => {
    expect(PURGE_TARGET_TITLES).toEqual([
      "Projeto Neuroplasticidade – Repertório Musical",
      "Projeto Neuroplasticidade – Repertório Musical (Manhã)",
      "Projeto Neuroplasticidade – Repertório Musical (Noite)",
      "Projeto Neuroplasticidade – Leitura",
    ]);
  });

  it("matches only exact titles", () => {
    expect(matchesPurgeTitle("Projeto Neuroplasticidade – Leitura")).toBe(true);
    expect(matchesPurgeTitle("Projeto Neuroplasticidade – Leitura ")).toBe(false);
    expect(matchesPurgeTitle("Projeto Neuroplasticidade")).toBe(false);
    expect(matchesPurgeTitle("Reunião com cliente")).toBe(false);
    expect(matchesPurgeTitle(undefined)).toBe(false);
  });
});

describe("delete outcome classification", () => {
  it("treats 204/404/410 as finished", () => {
    expect(classifyDeleteStatus(204)).toBe("removed");
    expect(classifyDeleteStatus(404)).toBe("already_gone");
    expect(classifyDeleteStatus(410)).toBe("already_gone");
  });

  it("treats quota 403, 429 and 5xx as transient", () => {
    expect(classifyDeleteStatus(429)).toBe("transient");
    expect(classifyDeleteStatus(500)).toBe("transient");
    expect(classifyDeleteStatus(503)).toBe("transient");
    expect(
      classifyDeleteStatus(403, JSON.stringify({ error: { errors: [{ domain: "usageLimits", reason: "rateLimitExceeded" }] } })),
    ).toBe("transient");
  });

  it("treats other failures as permanent", () => {
    expect(classifyDeleteStatus(400, "bad request")).toBe("permanent");
    expect(classifyDeleteStatus(403, "insufficient permissions")).toBe("permanent");
  });
});

describe("target dedupe", () => {
  it("collapses a series to its master and keeps order", () => {
    expect(
      dedupeRemoteTargets([
        { google_event_id: "a_1", recurring_event_id: "master" },
        { google_event_id: "a_2", recurring_event_id: "master" },
        { google_event_id: "single", recurring_event_id: null },
        { google_event_id: null, recurring_event_id: null },
      ]),
    ).toEqual(["master", "single"]);
  });
});

describe("scan url", () => {
  it("queries masters inside the authorized window", () => {
    const url = buildPurgeScanUrl({
      calendarId: "primary",
      timeMin: "2026-07-22T00:00:00.000Z",
      timeMax: "2028-07-22T00:00:00.000Z",
    });
    expect(url).toContain(`q=${encodeURIComponent(PURGE_SCAN_QUERY).replace(/%20/g, "+")}`);
    expect(url).toContain("singleEvents=false");
    expect(url).toContain("timeMin=2026-07-22");
    expect(url).toContain("timeMax=2028-07-22");
  });
});

describe("aggregated error summary", () => {
  it("counts by status only, never ids", () => {
    const s = bumpErrorSummary(bumpErrorSummary({}, 400), 400);
    expect(s).toEqual({ status_400: 2 });
  });
});

describe("provenance guard (root cause)", () => {
  it("flags google-origin rows", () => {
    expect(isProviderOriginEvent({ source: "google" })).toBe(true);
    expect(isProviderOriginEvent({ is_read_only: true })).toBe(true);
    expect(isProviderOriginEvent({ recurrence: ["RRULE:FREQ=DAILY"] })).toBe(true);
    expect(isProviderOriginEvent({ source: null })).toBe(false);
  });

  it("never creates a remote copy for provider-origin or already mapped rows", () => {
    expect(canCreateOnGoogle({ source: "google" }, { hasAnyMapping: false })).toBe(false);
    expect(canCreateOnGoogle({ source: null }, { hasAnyMapping: true })).toBe(false);
    expect(canCreateOnGoogle({ is_read_only: true }, { hasAnyMapping: false })).toBe(false);
  });

  it("allows creation only for proven-local unmapped rows", () => {
    expect(canCreateOnGoogle({ source: "local" }, { hasAnyMapping: false })).toBe(true);
    expect(canCreateOnGoogle({ source: null, is_read_only: false }, { hasAnyMapping: false })).toBe(true);
  });
});

describe("wiring", () => {
  it("push create path is gated by the provenance guard", () => {
    expect(syncSource).toContain("canCreateOnGoogle(event, { hasAnyMapping: Boolean(existing) })");
    expect(syncSource).toContain("provider_origin_not_creatable");
  });

  it("purge endpoint is fail-closed on the cron secret", () => {
    expect(purgeSource).toContain("isAuthorizedInternalCall(req.headers.get(CRON_SECRET_HEADER), expected)");
    expect(purgeSource).toContain('json({ error: "Unauthorized" }, 401)');
  });

  it("purge never re-enables sync", () => {
    expect(purgeSource).not.toContain("sync_enabled");
    expect(purgeSource).not.toContain("auto_sync_enabled");
  });

  it("purge preserves the cursor on transient failures", () => {
    expect(purgeSource).toContain('throttled = true');
    expect(purgeSource).toContain("cursor_preserved=true");
  });

  it("purge marks mappings deleted only after a confirmed removal", () => {
    expect(purgeSource).toContain('if (outcome === "removed" || outcome === "already_gone")');
    expect(purgeSource).toContain("google_calendar_purge_mark_target");
  });
});
