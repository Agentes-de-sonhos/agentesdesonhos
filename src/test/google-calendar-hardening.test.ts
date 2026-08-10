import { describe, it, expect } from "vitest";
import {
  buildTokenColumns,
  encryptToken,
  isCiphertext,
  needsTokenMigration,
  readTokenField,
} from "../../supabase/functions/_shared/googleTokenCrypto.ts";
import {
  REQUIRED_SCOPES,
  LEGACY_FULL_SCOPE,
  hasRequiredScopes,
  hasCalendarsReadonly,
  isOverbroadScope,
  parseScopeString,
  resolveScopeVersion,
} from "../../supabase/functions/_shared/googleCalendarScopes.ts";

const KEY = "unit-test-key-0123456789";

describe("encryption at rest", () => {
  it("clears plaintext columns once both tokens are encrypted", async () => {
    const cols = await buildTokenColumns({ access_token: "a", refresh_token: "r" }, KEY);
    expect(cols.token_enc_version).toBe(1);
    expect(isCiphertext(cols.access_token_enc)).toBe(true);
    expect(isCiphertext(cols.refresh_token_enc)).toBe(true);
    expect(cols.access_token).toBeNull();
    expect(cols.refresh_token).toBeNull();
  });

  it("keeps plaintext when the row cannot reach version 1", async () => {
    const cols = await buildTokenColumns({ access_token: "a" }, KEY, null);
    expect(cols.token_enc_version).toBe(0);
    expect(cols.access_token).toBe("a");
    expect(cols.refresh_token).toBeUndefined();
  });

  it("stays legacy without a key and never writes plaintext into *_enc", async () => {
    const cols = await buildTokenColumns({ access_token: "a", refresh_token: "r" }, null);
    expect(cols.token_enc_version).toBe(0);
    expect(cols.access_token_enc).toBeUndefined();
    expect(cols.refresh_token_enc).toBeUndefined();
  });

  it("round-trips an encrypted value", async () => {
    const enc = await encryptToken("secret-value", KEY);
    expect(await readTokenField({ access_token_enc: enc }, "access_token", KEY)).toBe("secret-value");
  });

  it("is fail-closed when a migrated row cannot be decrypted", async () => {
    const enc = await encryptToken("secret-value", KEY);
    const row = { access_token: "legacy", access_token_enc: enc, token_enc_version: 1 };
    expect(await readTokenField(row, "access_token", "wrong-key")).toBeNull();
    expect(await readTokenField(row, "access_token", null)).toBeNull();
  });

  it("still reads legacy plaintext while the row is unmigrated", async () => {
    expect(await readTokenField({ access_token: "legacy" }, "access_token", KEY)).toBe("legacy");
  });

  it("detects rows pending lazy migration", () => {
    expect(needsTokenMigration({ access_token: "legacy" })).toBe(true);
    expect(needsTokenMigration({ access_token: null, refresh_token: null })).toBe(false);
    expect(needsTokenMigration(null)).toBe(false);
  });
});

describe("minimal OAuth scopes", () => {
  it("requests only events + calendars.readonly", () => {
    expect([...REQUIRED_SCOPES]).toEqual([
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendars.readonly",
    ]);
    expect(REQUIRED_SCOPES).not.toContain(LEGACY_FULL_SCOPE);
  });

  it("accepts the minimal grant and the legacy broad grant", () => {
    const minimal = parseScopeString(REQUIRED_SCOPES.join(" "));
    expect(hasRequiredScopes(minimal)).toBe(true);
    expect(hasCalendarsReadonly(minimal)).toBe(true);
    expect(isOverbroadScope(minimal)).toBe(false);
    expect(resolveScopeVersion(minimal)).toBe(2);

    const legacy = parseScopeString(LEGACY_FULL_SCOPE);
    expect(hasRequiredScopes(legacy)).toBe(true);
    expect(isOverbroadScope(legacy)).toBe(true);
    expect(resolveScopeVersion(legacy)).toBe(1);
  });

  it("rejects a grant without the events scope", () => {
    const partial = parseScopeString("https://www.googleapis.com/auth/calendar.calendars.readonly");
    expect(hasRequiredScopes(partial)).toBe(false);
    expect(resolveScopeVersion(partial)).toBe(0);
    expect(parseScopeString(null)).toEqual([]);
  });
});
