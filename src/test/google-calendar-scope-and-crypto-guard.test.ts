import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  hasLegacyBroadScope,
  legacyScopeNotice,
  missingTimeZoneScope,
  timeZoneScopeNotice,
  SCOPE_CALENDAR_FULL,
  SCOPE_CALENDARS_READONLY,
  SCOPE_EVENTS,
  type CalendarConnectionStatus,
} from "@/lib/googleCalendarConnection";

const base: CalendarConnectionStatus = { connected: true, connection_state: "connected" };

describe("scope detection: broad grants and events-only grants", () => {
  it("flags broad + events as still overbroad", () => {
    const status = { ...base, granted_scopes: `${SCOPE_CALENDAR_FULL} ${SCOPE_EVENTS}` };
    expect(hasLegacyBroadScope(status)).toBe(true);
    expect(legacyScopeNotice(status)).toBeTruthy();
    // Broad grant already covers time zone reads: no fallback warning.
    expect(missingTimeZoneScope(status)).toBe(false);
    expect(timeZoneScopeNotice(status)).toBeNull();
  });

  it("warns (non-fatally) on an events-only grant", () => {
    const status = { ...base, granted_scopes: SCOPE_EVENTS };
    expect(hasLegacyBroadScope(status)).toBe(false);
    expect(missingTimeZoneScope(status)).toBe(true);
    const notice = timeZoneScopeNotice(status) ?? "";
    expect(notice).toContain("continuam sincronizando");
  });

  it("stays silent for the current minimal pair", () => {
    const status = { ...base, granted_scopes: `${SCOPE_EVENTS} ${SCOPE_CALENDARS_READONLY}` };
    expect(missingTimeZoneScope(status)).toBe(false);
    expect(hasLegacyBroadScope(status)).toBe(false);
  });

  it("stays silent when scopes are unknown or the account is disconnected", () => {
    expect(missingTimeZoneScope({ ...base, granted_scopes: null })).toBe(false);
    expect(missingTimeZoneScope({ connected: false, granted_scopes: SCOPE_EVENTS })).toBe(false);
  });
});

describe("production credential writes never use buildTokenColumns", () => {
  const files = [
    "supabase/functions/google-calendar-sync/index.ts",
    "supabase/functions/google-calendar-callback/index.ts",
    "supabase/functions/google-calendar-auth/index.ts",
  ];

  for (const file of files) {
    it(`${file} does not import or call buildTokenColumns`, () => {
      const source = readFileSync(file, "utf8");
      expect(source.includes("buildTokenColumns")).toBe(false);
    });
  }

  it("sync persists refreshed credentials only through the verified builder", () => {
    const source = readFileSync("supabase/functions/google-calendar-sync/index.ts", "utf8");
    expect(source).toContain("buildVerifiedEncryptedColumns");
    expect(source).toContain("verified-encryption-unavailable");
  });
});