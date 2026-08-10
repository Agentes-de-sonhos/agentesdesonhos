import { describe, it, expect } from "vitest";
import {
  hasLegacyBroadScope,
  legacyScopeNotice,
  SCOPE_CALENDAR_FULL,
  SCOPE_CALENDARS_READONLY,
  SCOPE_EVENTS,
  type CalendarConnectionStatus,
} from "@/lib/googleCalendarConnection";

const base: CalendarConnectionStatus = { connected: true, connection_state: "connected" };

describe("legacy broad scope detection", () => {
  it("flags a connection granted only the broad calendar scope", () => {
    const status = { ...base, granted_scopes: SCOPE_CALENDAR_FULL };
    expect(hasLegacyBroadScope(status)).toBe(true);
    expect(legacyScopeNotice(status)).toContain("continua funcionando");
  });

  it("does not flag the current minimal pair", () => {
    const status = { ...base, granted_scopes: `${SCOPE_EVENTS} ${SCOPE_CALENDARS_READONLY}` };
    expect(hasLegacyBroadScope(status)).toBe(false);
    expect(legacyScopeNotice(status)).toBeNull();
  });

  it("does not flag when scope metadata is unknown", () => {
    expect(hasLegacyBroadScope({ ...base, granted_scopes: null })).toBe(false);
    expect(hasLegacyBroadScope({ ...base, granted_scopes: "  " })).toBe(false);
  });

  it("never flags a disconnected account", () => {
    expect(hasLegacyBroadScope({ connected: false, granted_scopes: SCOPE_CALENDAR_FULL })).toBe(false);
  });

  it("treats comma separated scope lists the same way", () => {
    expect(hasLegacyBroadScope({ ...base, granted_scopes: `${SCOPE_CALENDAR_FULL},openid` })).toBe(true);
  });

  it("is non-fatal: the notice never asks the user to stop using the sync", () => {
    const notice = legacyScopeNotice({ ...base, granted_scopes: SCOPE_CALENDAR_FULL }) ?? "";
    expect(notice.toLowerCase()).not.toContain("desconecte");
    expect(notice.toLowerCase()).not.toContain("obrigat");
  });
});

describe("edge function source guarantees", () => {
  const read = async (p: string) => await (await import("node:fs/promises")).readFile(p, "utf8");

  it("readTokenField never falls back to plaintext for encrypted rows", async () => {
    const src = await read("supabase/functions/_shared/googleTokenCrypto.ts");
    const block = src.slice(src.indexOf("claimsEncrypted"), src.indexOf("isCiphertext(encValue)", src.indexOf("claimsEncrypted") + 200));
    expect(block).toContain("return null");
    expect(src).toContain("buildVerifiedEncryptedColumns");
  });

  it("verified encryption compares the decrypted round-trip before clearing plaintext", async () => {
    const src = await read("supabase/functions/_shared/googleTokenCrypto.ts");
    expect(src).toContain("accessBack !== access || refreshBack !== refresh");
  });

  it("disconnect purge goes through the transactional RPC, not row loops", async () => {
    const src = await read("supabase/functions/google-calendar-sync/index.ts");
    expect(src).toContain("purge_google_calendar_local_copies");
    expect(src).toContain("purge_failed");
  });

  it("callback requires the encryption key and uses verified encryption", async () => {
    const src = await read("supabase/functions/google-calendar-callback/index.ts");
    expect(src).toContain("buildVerifiedEncryptedColumns");
  });
});