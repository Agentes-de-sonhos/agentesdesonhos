import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildGooglePushPayload,
  buildReadOnlyReclassification,
  wallTimeInZone,
} from "../../supabase/functions/_shared/calendarFidelity.ts";

const SYNC = readFileSync("supabase/functions/google-calendar-sync/index.ts", "utf8");

describe("pull fail-closed on reverse/local inventory errors", () => {
  it("aborts the pull and preserves cursors when a mapping chunk fails", () => {
    expect(SYNC).toContain("pullInventoryFailed = true");
    expect(SYNC).toContain("reverse_mapping_fetch_failed");
    expect(SYNC).toContain("mapped_local_fetch_failed");
    // no silent `continue` that would turn mapped events into "new" ones
    expect(SYNC).not.toMatch(/reverse-map-fetch-error[\s\S]{0,200}continue;/);
  });

  it("blocks cursor advancement while the inventory is unreliable", () => {
    expect(SYNC).toMatch(/pullBlocked/);
  });
});

describe("instant → wall time in a real IANA zone", () => {
  it("Asia/Tokyo", () => {
    expect(wallTimeInZone("2026-03-10T00:30:00.000Z", "Asia/Tokyo")).toEqual({
      date: "2026-03-10",
      time: "09:30",
    });
  });

  it("Europe/Lisbon", () => {
    expect(wallTimeInZone("2026-01-15T23:15:00.000Z", "Europe/Lisbon")).toEqual({
      date: "2026-01-15",
      time: "23:15",
    });
  });

  it("America/New_York across the DST jump", () => {
    // 2026-03-08 07:00Z = 02:00 EST → clocks jump to 03:00 EDT
    expect(wallTimeInZone("2026-03-08T06:30:00.000Z", "America/New_York")).toEqual({
      date: "2026-03-08",
      time: "01:30",
    });
    expect(wallTimeInZone("2026-03-08T08:30:00.000Z", "America/New_York")).toEqual({
      date: "2026-03-08",
      time: "04:30",
    });
  });

  it("never treats an ISO UTC string as local wall time", () => {
    const utc = wallTimeInZone("2026-07-01T12:00:00.000Z", "Asia/Tokyo");
    expect(utc.time).not.toBe("12:00");
  });
});

describe("push uses start_at/end_at instants when wall fields are missing", () => {
  it("derives both ends in the resolved zone, no 60m fallback", () => {
    const payload = buildGooglePushPayload(
      {
        id: "e1",
        title: "Reunião",
        start_at: "2026-05-04T12:00:00.000Z",
        end_at: "2026-05-04T14:30:00.000Z",
        time_zone: "Asia/Tokyo",
      } as never,
      {},
    );
    expect(payload.start).toEqual({ dateTime: "2026-05-04T21:00:00", timeZone: "Asia/Tokyo" });
    expect(payload.end).toEqual({ dateTime: "2026-05-04T23:30:00", timeZone: "Asia/Tokyo" });
  });

  it("falls back to 60 minutes only when no end exists at all", () => {
    const payload = buildGooglePushPayload(
      { id: "e2", title: "X", event_date: "2026-05-04", event_time: "10:00", time_zone: "Europe/Lisbon" } as never,
      {},
    );
    expect(payload.end).toEqual({ dateTime: "2026-05-04T11:00:00", timeZone: "Europe/Lisbon" });
  });

  it("uses the calendar time zone discovered from Google, not a missing column", () => {
    expect(SYNC).toContain("ensureCalendarTimeZone");
    expect(SYNC).toContain("calendar_time_zone_checked_at");
    expect(SYNC).toContain("profileTimeZone: calendarTimeZone");
  });
});

describe("conflicts — exact version dedupe and safe 412 baseline", () => {
  it("looks up the exact version instead of any open conflict", () => {
    expect(SYNC).not.toMatch(/\.eq\("status", "open"\)/);
    expect(SYNC).toContain('versionQuery.eq("google_etag"');
    expect(SYNC).toContain('versionQuery.eq("local_updated_at"');
    expect(SYNC).toContain('versionQuery.eq("sync_id"');
  });

  it("412 records the current remote etag/snapshot via a safe GET", () => {
    expect(SYNC).toContain("safeGetGoogleEvent");
    expect(SYNC).toContain("conflict-baseline-get-failed");
    // a failed GET still records the conflict without overwriting
    expect(SYNC).toMatch(/safeGetGoogleEvent[\s\S]{0,400}conflictType: "precondition_failed"/);
  });
});

describe("legacy read-only backfill is released on the first real pull", () => {
  it("plain editable Google events lose is_read_only but keep origin=google", () => {
    const reclass = buildReadOnlyReclassification(
      { id: "g1", eventType: "default", organizer: { self: true } } as never,
      { is_read_only: true, is_google_managed: false, origin: "google" },
    );
    expect(reclass).toEqual({ is_read_only: false, is_google_managed: false, event_type: "default" });
    expect(SYNC).toContain("buildReadOnlyReclassification");
    expect(SYNC).toContain("read-only-reclassified");
  });

  it("genuinely restricted events stay read-only", () => {
    expect(
      buildReadOnlyReclassification(
        { id: "g2", eventType: "birthday" } as never,
        { is_read_only: true, is_google_managed: true, origin: "google" },
      ),
    ).toBeNull();
    expect(
      buildReadOnlyReclassification(
        { id: "g3", eventType: "default", recurringEventId: "r1" } as never,
        { is_read_only: false, is_google_managed: false, origin: "google" },
      ),
    ).toMatchObject({ is_read_only: true });
  });

  it("no change → no write", () => {
    expect(
      buildReadOnlyReclassification(
        { id: "g4", eventType: "default", organizer: { self: true } } as never,
        { is_read_only: false, is_google_managed: false, origin: "google" },
      ),
    ).toBeNull();
  });
});
