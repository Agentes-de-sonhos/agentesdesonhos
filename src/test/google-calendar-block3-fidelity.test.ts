/**
 * Block 3 — fidelity, conflict policy and safe deletions.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertControlledPayload,
  buildConflictRecord,
  buildGooglePushPayload,
  buildMappingMetadata,
  buildPatchHeaders,
  buildProviderSnapshot,
  canDeleteRemotely,
  canPushUpdate,
  classifyChange,
  classifyGoogleEvent,
  conflictDedupKey,
  decideSyncAction,
  extractConferenceUrl,
  FALLBACK_TIME_ZONE,
  FORBIDDEN_PUSH_FIELDS,
  isPreconditionFailed,
  mapGoogleEventToLocal,
  resolvePushTimeZone,
  shiftDay,
  shiftWallTime,
  summarizeAttendees,
} from "../../supabase/functions/_shared/calendarFidelity";
import {
  conflictBannerLabel,
  deleteSkipLabel,
  readOnlySkipLabel,
  remoteDeletionWarning,
  attendeeSummaryLabel,
} from "@/lib/googleCalendarFidelityReport";

const fn = (rel: string) => readFileSync(join(process.cwd(), "supabase/functions", rel), "utf8");
const SYNC = fn("google-calendar-sync/index.ts");

describe("pull fidelity — simple timed event", () => {
  const g = {
    id: "g1",
    etag: '"e1"',
    summary: "Reunião com cliente",
    description: "pauta",
    location: "Av. Paulista 1000",
    start: { dateTime: "2026-09-10T14:30:00-03:00", timeZone: "America/Sao_Paulo" },
    end: { dateTime: "2026-09-10T16:45:00-03:00", timeZone: "America/Sao_Paulo" },
    updated: "2026-09-01T10:00:00Z",
  };

  it("keeps the real wall time, real duration and timezone", () => {
    const local = mapGoogleEventToLocal(g)!;
    expect(local.event_date).toBe("2026-09-10");
    expect(local.event_time).toBe("14:30");
    expect(local.end_date).toBe("2026-09-10");
    expect(local.end_time).toBe("16:45"); // not flattened to 15:30
    expect(local.time_zone).toBe("America/Sao_Paulo");
    expect(local.all_day).toBe(false);
    expect(local.start_at).toBe("2026-09-10T17:30:00.000Z");
    expect(local.end_at).toBe("2026-09-10T19:45:00.000Z");
    expect(local.location).toBe("Av. Paulista 1000");
    expect(local.is_read_only).toBe(false);
    expect(local.source).toBe("google");
  });

  it("does not convert a foreign timezone into local wall time", () => {
    const tokyo = mapGoogleEventToLocal({
      ...g,
      start: { dateTime: "2026-09-10T09:00:00+09:00", timeZone: "Asia/Tokyo" },
      end: { dateTime: "2026-09-10T10:30:00+09:00", timeZone: "Asia/Tokyo" },
    })!;
    expect(tokyo.event_time).toBe("09:00");
    expect(tokyo.end_time).toBe("10:30");
    expect(tokyo.time_zone).toBe("Asia/Tokyo");
    expect(tokyo.start_at).toBe("2026-09-10T00:00:00.000Z");
  });

  it("handles a DST transition without shifting the wall clock", () => {
    // US DST start 2026-03-08: 02:00 → 03:00 in America/New_York.
    const before = mapGoogleEventToLocal({
      ...g,
      start: { dateTime: "2026-03-07T23:30:00-05:00", timeZone: "America/New_York" },
      end: { dateTime: "2026-03-08T04:30:00-04:00", timeZone: "America/New_York" },
    })!;
    expect(before.event_time).toBe("23:30");
    expect(before.end_date).toBe("2026-03-08");
    expect(before.end_time).toBe("04:30");
    // Real elapsed time is 4h (not 5h) because the offset changed.
    const ms = new Date(before.end_at!).getTime() - new Date(before.start_at!).getTime();
    expect(ms).toBe(4 * 3600_000);
  });
});

describe("pull fidelity — all-day, Meet, attendees, reminders, organizer", () => {
  it("all-day uses Google's exclusive end and stores the inclusive last day", () => {
    const local = mapGoogleEventToLocal({
      id: "g2",
      summary: "Feira de turismo",
      start: { date: "2026-05-04" },
      end: { date: "2026-05-07" }, // exclusive
    })!;
    expect(local.all_day).toBe(true);
    expect(local.event_date).toBe("2026-05-04");
    expect(local.end_date).toBe("2026-05-06");
    expect(local.event_time).toBeNull();
    expect(local.start_at).toBeNull();
  });

  it("single-day all-day event never ends before it starts", () => {
    const local = mapGoogleEventToLocal({
      id: "g3",
      start: { date: "2026-05-04" },
      end: { date: "2026-05-05" },
    })!;
    expect(local.end_date).toBe("2026-05-04");
  });

  it("extracts Meet link, attendees, reminders, organizer and recurrence", () => {
    const g = {
      id: "g4",
      summary: "Treinamento",
      start: { dateTime: "2026-06-01T10:00:00-03:00", timeZone: "America/Sao_Paulo" },
      end: { dateTime: "2026-06-01T11:00:00-03:00", timeZone: "America/Sao_Paulo" },
      conferenceData: {
        entryPoints: [
          { entryPointType: "phone", uri: "tel:+551130000000" },
          { entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" },
        ],
      },
      attendees: [
        { email: "a@x.com", responseStatus: "accepted" },
        { email: "b@x.com", responseStatus: "declined" },
        { email: "c@x.com", responseStatus: "needsAction", optional: true },
      ],
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 }] },
      organizer: { email: "org@x.com", displayName: "Org", self: true },
      recurrence: ["RRULE:FREQ=WEEKLY;COUNT=4"],
    };
    const local = mapGoogleEventToLocal(g)!;
    expect(local.conference_url).toBe("https://meet.google.com/abc-defg-hij");
    expect(local.attendees).toHaveLength(3);
    expect((local.attendees as any[])[2]).toMatchObject({ email: "c@x.com", optional: true });
    expect(local.reminders).toEqual(g.reminders);
    expect(local.organizer).toEqual({ email: "org@x.com", displayName: "Org", self: true });
    expect(local.recurrence).toEqual(["RRULE:FREQ=WEEKLY;COUNT=4"]);
    expect(summarizeAttendees(g)).toEqual({ count: 3, accepted: 1, declined: 1, needs_action: 1 });
    expect(extractConferenceUrl({ id: "x", hangoutLink: "https://meet.google.com/legacy" })).toBe(
      "https://meet.google.com/legacy",
    );
  });

  it("provider snapshot carries counts, not the guest list", () => {
    const snap = buildProviderSnapshot({
      id: "g5",
      etag: '"e"',
      attendees: [{ email: "secret@x.com", responseStatus: "accepted" }],
      start: { date: "2026-01-01" },
    });
    expect(JSON.stringify(snap)).not.toContain("secret@x.com");
    expect(snap.attendee_summary.count).toBe(1);
  });

  it("returns null when there is no start at all", () => {
    expect(mapGoogleEventToLocal({ id: "g6" })).toBeNull();
  });
});

describe("read-only classification", () => {
  it("recurring instances, managed types, foreign organizer and secondary calendars", () => {
    expect(classifyGoogleEvent({ id: "a", recurringEventId: "series" }).isReadOnly).toBe(true);
    expect(classifyGoogleEvent({ id: "a", recurringEventId: "series" }).isRecurringInstance).toBe(true);
    const bday = classifyGoogleEvent({ id: "b", eventType: "birthday" });
    expect(bday.isGoogleManaged).toBe(true);
    expect(bday.isReadOnly).toBe(true);
    expect(classifyGoogleEvent({ id: "c", locked: true }).isGoogleManaged).toBe(true);
    expect(
      classifyGoogleEvent({ id: "d", organizer: { self: false } }).reasons,
    ).toContain("organizer_not_editable");
    // Guests allowed to modify → still editable.
    expect(
      classifyGoogleEvent({ id: "e", organizer: { self: false }, guestsCanModify: true }).isReadOnly,
    ).toBe(false);
    expect(classifyGoogleEvent({ id: "f" }, { calendarId: "other@group" }).reasons).toContain(
      "secondary_calendar",
    );
    expect(classifyGoogleEvent({ id: "g", eventType: "default" }).isReadOnly).toBe(false);
  });

  it("recurring instance keeps recurringEventId/originalStartTime and is read-only locally", () => {
    const g = {
      id: "inst1",
      etag: '"e"',
      summary: "Weekly",
      recurringEventId: "series-1",
      originalStartTime: { dateTime: "2026-04-06T09:00:00-03:00" },
      start: { dateTime: "2026-04-13T09:00:00-03:00", timeZone: "America/Sao_Paulo" },
      end: { dateTime: "2026-04-13T09:30:00-03:00", timeZone: "America/Sao_Paulo" },
    };
    expect(mapGoogleEventToLocal(g)!.is_read_only).toBe(true);
    const meta = buildMappingMetadata(g, { origin: "google", now: "2026-04-13T00:00:00Z" });
    expect(meta.recurring_event_id).toBe("series-1");
    expect(meta.original_start_time).toBe("2026-04-06T09:00:00-03:00");
    expect(meta.is_read_only).toBe(true);
    expect(meta.origin).toBe("google");
    expect(canPushUpdate({ recurring_event_id: "series-1" })).toBe(false);
    expect(canPushUpdate({ event_type: "outOfOffice" })).toBe(false);
    expect(canPushUpdate({ is_google_managed: true })).toBe(false);
    expect(canPushUpdate({ origin: "local", event_type: "default" })).toBe(true);
  });
});

describe("push payload — non-destructive and correctly built", () => {
  it("carries only UI-controlled fields", () => {
    const payload = buildGooglePushPayload({
      title: "Visita",
      description: "obs",
      event_date: "2026-07-02",
      event_time: "09:00",
      end_time: "10:30",
      time_zone: "America/Sao_Paulo",
      location: "Hotel X",
    });
    expect(Object.keys(payload).sort()).toEqual(["description", "end", "location", "start", "summary"]);
    for (const forbidden of FORBIDDEN_PUSH_FIELDS) {
      expect(payload as unknown as Record<string, unknown>).not.toHaveProperty(forbidden);
    }
    expect(() =>
      assertControlledPayload(payload as unknown as Record<string, unknown>),
    ).not.toThrow();
    expect(() =>
      assertControlledPayload({ ...payload, attendees: [] } as unknown as Record<string, unknown>),
    ).toThrow(/attendees/);
  });

  it("omits location when the local record has none", () => {
    const payload = buildGooglePushPayload({
      title: "t",
      event_date: "2026-07-02",
      event_time: "09:00",
      location: "   ",
    });
    expect(payload).not.toHaveProperty("location");
  });

  it("timed events use wall time + IANA zone, never a fixed offset", () => {
    const payload = buildGooglePushPayload({
      title: "t",
      event_date: "2026-07-02",
      event_time: "09:00:00",
      end_time: "11:00",
      time_zone: "Europe/Lisbon",
    });
    expect(payload.start).toEqual({ dateTime: "2026-07-02T09:00:00", timeZone: "Europe/Lisbon" });
    expect(payload.end).toEqual({ dateTime: "2026-07-02T11:00:00", timeZone: "Europe/Lisbon" });
    expect(JSON.stringify(payload)).not.toContain("-03:00");
  });

  it("legacy events without end use the configurable fallback duration", () => {
    const def = buildGooglePushPayload({ title: "t", event_date: "2026-07-02", event_time: "09:00" });
    expect(def.end.dateTime).toBe("2026-07-02T10:00:00");
    const custom = buildGooglePushPayload(
      { title: "t", event_date: "2026-07-02", event_time: "09:00" },
      { defaultDurationMinutes: 30 },
    );
    expect(custom.end.dateTime).toBe("2026-07-02T09:30:00");
    // Crossing midnight carries the day.
    const late = buildGooglePushPayload({ title: "t", event_date: "2026-07-02", event_time: "23:30" });
    expect(late.end.dateTime).toBe("2026-07-03T00:30:00");
  });

  it("all-day pushes an exclusive end date", () => {
    const one = buildGooglePushPayload({ title: "t", event_date: "2026-07-02", all_day: true });
    expect(one.start).toEqual({ date: "2026-07-02" });
    expect(one.end).toEqual({ date: "2026-07-03" });
    const range = buildGooglePushPayload({
      title: "t",
      event_date: "2026-07-02",
      end_date: "2026-07-05",
      all_day: true,
    });
    expect(range.end).toEqual({ date: "2026-07-06" });
  });

  it("timezone resolution: event → profile → IANA fallback, never an offset", () => {
    expect(resolvePushTimeZone({ time_zone: "Europe/Madrid" }, "America/Bahia")).toBe("Europe/Madrid");
    expect(resolvePushTimeZone({ time_zone: "-03:00" }, "America/Bahia")).toBe("America/Bahia");
    expect(resolvePushTimeZone({}, null)).toBe(FALLBACK_TIME_ZONE);
    expect(resolvePushTimeZone({ time_zone: "" }, "GMT-3")).toBe(FALLBACK_TIME_ZONE);
  });

  it("PATCH uses If-Match and 412 is a conflict, not a blind retry", () => {
    expect(buildPatchHeaders('"etag1"')).toEqual({
      "Content-Type": "application/json",
      "If-Match": '"etag1"',
    });
    expect(buildPatchHeaders(null)).toEqual({ "Content-Type": "application/json" });
    expect(isPreconditionFailed(412)).toBe(true);
    expect(isPreconditionFailed(409)).toBe(false);

    expect(SYNC).toContain('method: "PATCH"');
    expect(SYNC).toContain("headers: buildPatchHeaders(existing.google_etag)");
    expect(SYNC).toContain("assertControlledPayload(googleEvent as unknown as Record<string, unknown>)");
    expect(SYNC).toContain('conflictType: "precondition_failed"');
    // No PUT/update replacement of the whole Google event anymore.
    expect(SYNC).not.toContain('method: "PUT"');
  });

  it("helpers used by the builders are correct", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftWallTime("23:10", 60)).toEqual({ time: "00:10", dayCarry: 1 });
    expect(shiftWallTime("08:00", 90)).toEqual({ time: "09:30", dayCarry: 0 });
  });
});

describe("conflict policy", () => {
  const snapshotBase = {
    snapshotEtag: '"v1"',
    snapshotUpdated: "2026-01-01T00:00:00Z",
    localMarker: "2026-01-01T00:00:00Z",
  };

  it("only Google changed → pull", () => {
    const change = classifyChange({
      ...snapshotBase,
      googleEtag: '"v2"',
      googleUpdated: "2026-01-02T00:00:00Z",
      localUpdatedAt: "2026-01-01T00:00:00Z",
    });
    expect(change).toBe("google_only");
    expect(decideSyncAction(change, { origin: "google" })).toBe("pull");
  });

  it("only local changed → push (unless read-only)", () => {
    const change = classifyChange({
      ...snapshotBase,
      googleEtag: '"v1"',
      googleUpdated: "2026-01-01T00:00:00Z",
      localUpdatedAt: "2026-01-05T00:00:00Z",
    });
    expect(change).toBe("local_only");
    expect(decideSyncAction(change, { origin: "local" })).toBe("push");
    expect(decideSyncAction(change, { origin: "google", is_read_only: true })).toBe("skip_read_only");
    expect(decideSyncAction(change, { is_google_managed: true })).toBe("skip_read_only");
  });

  it("both changed → conflict, no side is overwritten", () => {
    const change = classifyChange({
      ...snapshotBase,
      googleEtag: '"v2"',
      googleUpdated: "2026-01-03T00:00:00Z",
      localUpdatedAt: "2026-01-04T00:00:00Z",
    });
    expect(change).toBe("both");
    expect(decideSyncAction(change, { origin: "local" })).toBe("conflict");
    expect(decideSyncAction(change, { origin: "google", is_read_only: true })).toBe("conflict");
  });

  it("nothing changed → noop", () => {
    expect(
      classifyChange({
        ...snapshotBase,
        googleEtag: '"v1"',
        googleUpdated: "2026-01-01T00:00:00Z",
        localUpdatedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe("none");
    expect(decideSyncAction("none", {})).toBe("noop");
  });

  it("conflict rows dedupe per mapping + version pair", () => {
    const g = { id: "g9", etag: '"v2"', updated: "2026-01-03T00:00:00Z", summary: "X" };
    const a = buildConflictRecord({
      userId: "u1",
      syncId: "s1",
      agencyEventId: "e1",
      googleEvent: g,
      localEvent: { id: "e1", title: "X local", updated_at: "2026-01-04T00:00:00Z" },
      now: "2026-01-05T00:00:00Z",
    });
    const b = buildConflictRecord({
      userId: "u1",
      syncId: "s1",
      agencyEventId: "e1",
      googleEvent: g,
      localEvent: { id: "e1", title: "X local", updated_at: "2026-01-04T00:00:00Z" },
      now: "2026-01-06T00:00:00Z",
    });
    expect(conflictDedupKey(a as any)).toBe(conflictDedupKey(b as any));
    const newer = buildConflictRecord({
      userId: "u1",
      syncId: "s1",
      googleEvent: { ...g, etag: '"v3"' },
      localEvent: { id: "e1", updated_at: "2026-01-04T00:00:00Z" },
    });
    expect(conflictDedupKey(newer as any)).not.toBe(conflictDedupKey(a as any));
    expect(a.status).toBe("open");
    expect(a.conflict_type).toBe("both_changed");
    // Snapshots exist for both sides.
    expect(a.google_snapshot).toBeTruthy();
    expect(a.local_snapshot).toBeTruthy();
  });

  it("a conflict never flags the connection as reconnect_required", () => {
    const conflictBlock = SYNC.slice(SYNC.indexOf("const recordConflict"), SYNC.indexOf("PHASE 1"));
    expect(conflictBlock).toContain("conflictMappingColumns");
    expect(conflictBlock).not.toContain("markReconnectRequired");
    expect(conflictBlock).not.toContain("reconnect_required");
  });
});

describe("pull really precedes push in the sync function", () => {
  it("phase 1 is the pull and phase 2 is the push", () => {
    const pullIdx = SYNC.indexOf("PHASE 1 — PULL");
    const pushIdx = SYNC.indexOf("PHASE 2 — PUSH");
    expect(pullIdx).toBeGreaterThan(0);
    expect(pushIdx).toBeGreaterThan(pullIdx);
    // Google list walk happens before the local push query.
    expect(SYNC.indexOf("buildEventsListUrl(")).toBeLessThan(SYNC.indexOf("let pushQuery = supabase"));
    // And before the push loop.
    expect(SYNC.indexOf("pull-summary")).toBeLessThan(SYNC.indexOf("push-start count="));
    expect(SYNC).toContain('phase_order: "pull_then_push"');
  });

  it("Block 2 cursors, budgets, locks and 410 handling are preserved", () => {
    expect(SYNC).toContain("resolveResumePageToken(pullMode, tokenRecord)");
    expect(SYNC).toContain("resolvePullWindow(pullMode, tokenRecord, localWindow)");
    expect(SYNC).toContain("isBudgetExhausted({ pages: pagesThisRun, items: itemsThisRun }, limits)");
    expect(SYNC).toContain("isCursorGoneStatus(pageRes.status)");
    expect(SYNC).toContain("nextPushCursor(processedPushEvents, pushCursor)");
    expect(SYNC).toContain("nextDeletedCursor(processedDeleted, deletedCursor)");
    expect(SYNC).toContain("if (!localErr && !mappingFetchFailed)");
    expect(SYNC).toContain("if (!deletedErr && !mappingFetchFailed)");
    expect(SYNC).toContain("buildKeysetOrFilter(\"deleted_at\"");
    expect(SYNC).toContain("if (!lockReleased)");
    // Fail-closed mapping lookup still guards both loops.
    expect(SYNC).toContain("const pushEvents: any[] = mappingFetchFailed ? [] : liveLocalEvents");
    expect(SYNC).toContain("const deleteEvents: any[] = mappingFetchFailed ? [] : deletedLocalEvents");
  });

  it("does not advance cursors when a needed step failed", () => {
    // Pull page error → no bootstrap/incremental progress is written.
    expect(SYNC).toContain("} else if (!pullBlocked) {");
    expect(SYNC).toContain("pullPageError || pullInventoryFailed");
    expect(SYNC).toContain("(mappingFetchFailed ? 1 : 0)");
  });
});

describe("safe deletions — origin google vs local", () => {
  it("only proven local-origin editable mappings may delete on Google", () => {
    expect(canDeleteRemotely({ origin: "local", is_read_only: false })).toEqual({ allowed: true });
    expect(canDeleteRemotely({ origin: "google" })).toEqual({ allowed: false, reason: "google_origin" });
    expect(canDeleteRemotely({ origin: "local", is_read_only: true })).toEqual({
      allowed: false,
      reason: "read_only",
    });
    expect(canDeleteRemotely({ origin: "local", is_google_managed: true })).toEqual({
      allowed: false,
      reason: "google_managed",
    });
    expect(canDeleteRemotely({ origin: "local", recurring_event_id: "s1" })).toEqual({
      allowed: false,
      reason: "recurring_instance",
    });
    expect(canDeleteRemotely({ origin: "local", event_type: "birthday" })).toEqual({
      allowed: false,
      reason: "google_managed",
    });
    // Legacy conservative mapping without provenance: never a remote delete.
    expect(canDeleteRemotely({})).toEqual({ allowed: false, reason: "unknown_origin" });
  });

  it("skipped remote deletions only unlink locally and are reported", () => {
    const block = SYNC.slice(SYNC.indexOf("const deleteDecision = canDeleteRemotely(mapping)"));
    expect(block).toContain("if (!deleteDecision.allowed)");
    // The unlink path touches the mapping only — no Google DELETE call.
    const unlink = block.slice(0, block.indexOf("try {"));
    expect(unlink).toContain('from("google_calendar_sync")');
    expect(unlink).not.toContain('method: "DELETE"');
    expect(unlink).toContain("deleteSkipReasons[deleteDecision.reason]");
    expect(block).toContain("remote_preserved=true");
    // DELETE is guarded by If-Match when an etag is known.
    expect(block).toContain('method: "DELETE", headers: mapping.google_etag ? { "If-Match": mapping.google_etag }');
  });

  it("new local pushes record origin=local; new pulls record origin=google", () => {
    expect(SYNC).toContain('origin: "local"');
    expect(SYNC).toContain('origin: "google"');
    expect(SYNC).toContain("is_read_only: false");
  });
});

describe("report/UI helpers keep diagnostics safe", () => {
  it("conflict and read-only banners", () => {
    expect(conflictBannerLabel({ conflicts_detected: 0 })).toBeNull();
    expect(conflictBannerLabel({ conflicts_detected: 1 })).toMatch(/1 conflito/);
    expect(conflictBannerLabel({ conflicts_detected: 3 })).toMatch(/3 conflitos/);
    expect(readOnlySkipLabel({ read_only_skipped: 2 })).toMatch(/2 eventos somente leitura/);
    expect(readOnlySkipLabel({})).toBeNull();
    expect(deleteSkipLabel("google_origin")).toMatch(/preservado no Google/);
    expect(deleteSkipLabel("whatever")).toBe("Exclusão remota não permitida");
  });

  it("explicit warning before a deletion may reach Google", () => {
    expect(remoteDeletionWarning("google", true)).toMatch(/permanecerá no Google/);
    expect(remoteDeletionWarning("local", false)).toMatch(/também será removido/);
  });

  it("attendee diagnostics show counts, never emails", () => {
    const label = attendeeSummaryLabel([{ email: "a@x.com" }, { email: "b@x.com" }]);
    expect(label).toBe("2 participantes");
    expect(label).not.toContain("@");
    expect(attendeeSummaryLabel([])).toBeNull();
  });
});